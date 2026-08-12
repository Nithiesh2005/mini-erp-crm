import { Router } from "express";
import { z } from "zod";
import { MovementType, Role } from "@prisma/client";
import prisma from "../config/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { pageQuery, paginate, pageResult } from "../lib/pagination";

const router = Router();

// Warehouse + Admin manage products/stock; every authenticated role can read.
const canWrite = requireRole(Role.ADMIN, Role.WAREHOUSE);

const productBody = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  minStockAlert: z.coerce.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

// Updates cannot touch currentStock directly — all stock changes must go
// through /stock-movements so the audit log stays complete.
const productUpdateBody = productBody.omit({ currentStock: true }).partial();

const listQuery = pageQuery.extend({
  search: z.string().optional(),
  category: z.string().optional(),
});

const movementBody = z.object({
  quantityChanged: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "quantityChanged must be non-zero"),
  reason: z.string().min(1),
});

router.use(requireAuth);

// GET /products?search=&category=&page=&limit=
router.get("/", validate(listQuery, "query"), async (req, res) => {
  const { page, limit, search, category } = req.valid as z.infer<typeof listQuery>;
  const where = {
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(page, limit) }),
    prisma.product.count({ where }),
  ]);
  res.json(pageResult(data, total, page, limit));
});

// POST /products — opening stock (if any) is logged as an IN movement so the
// audit trail is complete from the product's first row.
router.post("/", canWrite, validate(productBody), async (req, res) => {
  const data = req.valid as z.infer<typeof productBody>;
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({ data });
    if (p.currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: p.id,
          quantityChanged: p.currentStock,
          movementType: MovementType.IN,
          reason: "Opening stock",
          createdById: req.user!.id,
        },
      });
    }
    return p;
  });
  res.status(201).json(product);
});

// GET /products/:id
router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id as string } });
  if (!product) throw new AppError(404, "Product not found");
  res.json(product);
});

// PUT /products/:id  (currentStock excluded — adjust via stock-movements)
router.put("/:id", canWrite, validate(productUpdateBody), async (req, res) => {
  const data = req.valid as z.infer<typeof productUpdateBody>;
  const product = await prisma.product.update({ where: { id: req.params.id as string }, data });
  res.json(product);
});

// DELETE /products/:id  (blocked if used on any challan; its own stock log is removed with it)
router.delete("/:id", canWrite, async (req, res) => {
  const used = await prisma.challanItem.count({ where: { productId: req.params.id as string } });
  if (used) throw new AppError(409, "Cannot delete a product used on a challan");
  await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: { productId: req.params.id as string } }),
    prisma.product.delete({ where: { id: req.params.id as string } }),
  ]);
  res.status(204).end();
});

// GET /products/:id/stock-movements
router.get("/:id/stock-movements", async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { productId: req.params.id as string },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.json(movements);
});

// POST /products/:id/stock-movements  (manual stock adjustment)
// Every stock change writes a movement row; stock can never go negative.
router.post("/:id/stock-movements", canWrite, validate(movementBody), async (req, res) => {
  const { quantityChanged, reason } = req.valid as z.infer<typeof movementBody>;
  const movement = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id as string } });
    if (!product) throw new AppError(404, "Product not found");
    if (product.currentStock + quantityChanged < 0) {
      throw new AppError(
        400,
        `Insufficient stock for ${product.sku}: cannot reduce by ${-quantityChanged}, only ${product.currentStock} available`
      );
    }
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: { increment: quantityChanged } },
    });
    return tx.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged,
        movementType: quantityChanged > 0 ? MovementType.IN : MovementType.OUT,
        reason,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  });
  res.status(201).json(movement);
});

export default router;
