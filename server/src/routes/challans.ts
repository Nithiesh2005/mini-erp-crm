import { Router } from "express";
import { z } from "zod";
import { ChallanStatus, MovementType, Role } from "@prisma/client";
import prisma from "../config/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { nextChallanNumber } from "../lib/challanNumber";
import { pageQuery, paginate, pageResult } from "../lib/pagination";

const router = Router();

// Sales + Admin manage challans; every authenticated role can read.
const canWrite = requireRole(Role.ADMIN, Role.SALES);

const challanBody = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "A challan needs at least one item"),
});

const listQuery = pageQuery.extend({
  status: z.enum(ChallanStatus).optional(),
  customer_id: z.string().optional(),
});

const detailInclude = {
  items: true,
  customer: true,
  createdBy: { select: { id: true, name: true } },
} as const;

// Validates customer + products exist and builds snapshotted line items.
// Snapshots freeze name/sku/price at add time so later product edits never
// rewrite challan history.
async function buildItems(customerId: string, items: z.infer<typeof challanBody>["items"]) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(400, "Customer not found", "customerId");

  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const pmap = new Map(products.map((p) => [p.id, p]));
  const missing = ids.filter((id) => !pmap.has(id));
  if (missing.length) throw new AppError(400, `Unknown product(s): ${missing.join(", ")}`, "items");

  // Merge duplicate product lines into a single quantity.
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) ?? 0) + it.quantity);

  const itemData = [...merged].map(([productId, quantity]) => {
    const p = pmap.get(productId)!;
    return {
      productId,
      quantity,
      productNameSnapshot: p.name,
      skuSnapshot: p.sku,
      unitPriceSnapshot: p.unitPrice,
    };
  });
  const totalQuantity = itemData.reduce((s, i) => s + i.quantity, 0);
  return { itemData, totalQuantity };
}

router.use(requireAuth);

// GET /challans?status=&customer_id=&page=&limit=
router.get("/", validate(listQuery, "query"), async (req, res) => {
  const { page, limit, status, customer_id } = req.valid as z.infer<typeof listQuery>;
  const where = {
    ...(status ? { status } : {}),
    ...(customer_id ? { customerId: customer_id } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
      ...paginate(page, limit),
    }),
    prisma.challan.count({ where }),
  ]);
  res.json(pageResult(data, total, page, limit));
});

// POST /challans  (create as draft — no stock impact)
router.post("/", canWrite, validate(challanBody), async (req, res) => {
  const { customerId, items } = req.valid as z.infer<typeof challanBody>;
  const { itemData, totalQuantity } = await buildItems(customerId, items);
  const year = new Date().getFullYear();
  const challan = await prisma.$transaction(async (tx) => {
    const challanNumber = await nextChallanNumber(tx, year);
    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        createdById: req.user!.id,
        items: { create: itemData },
      },
      include: detailInclude,
    });
  });
  res.status(201).json(challan);
});

// GET /challans/:id
router.get("/:id", async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id as string },
    include: detailInclude,
  });
  if (!challan) throw new AppError(404, "Challan not found");
  res.json(challan);
});

// PUT /challans/:id  (edit while draft — replaces customer + items wholesale)
router.put("/:id", canWrite, validate(challanBody), async (req, res) => {
  const { customerId, items } = req.valid as z.infer<typeof challanBody>;
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id as string } });
  if (!existing) throw new AppError(404, "Challan not found");
  if (existing.status !== ChallanStatus.DRAFT) {
    throw new AppError(409, `Only draft challans can be edited (current: ${existing.status})`);
  }
  const { itemData, totalQuantity } = await buildItems(customerId, items);
  const challan = await prisma.$transaction(async (tx) => {
    await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
    return tx.challan.update({
      where: { id: existing.id },
      data: { customerId, totalQuantity, items: { create: itemData } },
      include: detailInclude,
    });
  });
  res.json(challan);
});

// DELETE /challans/:id  (draft or cancelled only; confirmed must be cancelled first)
router.delete("/:id", canWrite, async (req, res) => {
  const challan = await prisma.challan.findUnique({ where: { id: req.params.id as string } });
  if (!challan) throw new AppError(404, "Challan not found");
  if (challan.status === ChallanStatus.CONFIRMED) {
    throw new AppError(409, "Cancel the challan before deleting (stock is currently deducted)");
  }
  await prisma.challan.delete({ where: { id: challan.id } }); // items cascade
  res.status(204).end();
});

// POST /challans/:id/confirm
// All-or-nothing: if ANY line lacks stock, reject 400 with per-product detail
// and make NO changes. Otherwise decrement stock, log an OUT movement per line,
// and set status = CONFIRMED — all inside one transaction.
router.post("/:id/confirm", canWrite, async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });
  if (!challan) throw new AppError(404, "Challan not found");
  if (challan.status !== ChallanStatus.DRAFT) {
    throw new AppError(409, `Only draft challans can be confirmed (current: ${challan.status})`);
  }
  if (challan.items.length === 0) throw new AppError(400, "Cannot confirm an empty challan");

  await prisma.$transaction(async (tx) => {
    const ids = challan.items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: ids } } });
    const pmap = new Map(products.map((p) => [p.id, p]));

    const shortfalls: string[] = [];
    for (const it of challan.items) {
      const available = pmap.get(it.productId)?.currentStock ?? 0;
      if (available < it.quantity) {
        shortfalls.push(
          `Insufficient stock for ${it.skuSnapshot}: requested ${it.quantity}, available ${available}`
        );
      }
    }
    if (shortfalls.length) throw new AppError(400, shortfalls.join("; "));

    for (const it of challan.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { currentStock: { decrement: it.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          quantityChanged: -it.quantity,
          movementType: MovementType.OUT,
          reason: `Challan ${challan.challanNumber} confirmed`,
          createdById: req.user!.id,
        },
      });
    }
    await tx.challan.update({ where: { id: challan.id }, data: { status: ChallanStatus.CONFIRMED } });
  });

  const updated = await prisma.challan.findUnique({ where: { id: challan.id }, include: detailInclude });
  res.json(updated);
});

// POST /challans/:id/cancel
// Draft -> cancelled (no stock impact). Confirmed -> reverse stock with
// compensating IN movements, then cancelled. (Assumption documented in README.)
router.post("/:id/cancel", canWrite, async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });
  if (!challan) throw new AppError(404, "Challan not found");
  if (challan.status === ChallanStatus.CANCELLED) {
    throw new AppError(409, "Challan is already cancelled");
  }

  if (challan.status === ChallanStatus.DRAFT) {
    await prisma.challan.update({ where: { id: challan.id }, data: { status: ChallanStatus.CANCELLED } });
  } else {
    await prisma.$transaction(async (tx) => {
      for (const it of challan.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { currentStock: { increment: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            quantityChanged: it.quantity,
            movementType: MovementType.IN,
            reason: `Challan ${challan.challanNumber} cancelled`,
            createdById: req.user!.id,
          },
        });
      }
      await tx.challan.update({ where: { id: challan.id }, data: { status: ChallanStatus.CANCELLED } });
    });
  }

  const updated = await prisma.challan.findUnique({ where: { id: challan.id }, include: detailInclude });
  res.json(updated);
});

export default router;
