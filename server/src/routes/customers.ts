import { Router } from "express";
import { z } from "zod";
import { CustomerStatus, CustomerType, Role } from "@prisma/client";
import prisma from "../config/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { pageQuery, paginate, pageResult } from "../lib/pagination";

const router = Router();

// Sales + Admin can write customers; every authenticated role can read.
const canWrite = requireRole(Role.ADMIN, Role.SALES);

const customerBody = z.object({
  name: z.string().min(1),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(CustomerType).default(CustomerType.RETAIL),
  address: z.string().optional(),
  status: z.enum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional(),
});

const listQuery = pageQuery.extend({
  search: z.string().optional(),
  status: z.enum(CustomerStatus).optional(),
});

const followupBody = z.object({ note: z.string().min(1) });

router.use(requireAuth);

// GET /customers?search=&status=&page=&limit=
router.get("/", validate(listQuery, "query"), async (req, res) => {
  const { page, limit, search, status } = req.valid as z.infer<typeof listQuery>;
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { businessName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
          ],
        }
      : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(page, limit) }),
    prisma.customer.count({ where }),
  ]);
  res.json(pageResult(data, total, page, limit));
});

// POST /customers
router.post("/", canWrite, validate(customerBody), async (req, res) => {
  const data = req.valid as z.infer<typeof customerBody>;
  const customer = await prisma.customer.create({ data });
  res.status(201).json(customer);
});

// GET /customers/:id
router.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id as string } });
  if (!customer) throw new AppError(404, "Customer not found");
  res.json(customer);
});

// PUT /customers/:id
router.put("/:id", canWrite, validate(customerBody.partial()), async (req, res) => {
  const data = req.valid as Partial<z.infer<typeof customerBody>>;
  const customer = await prisma.customer.update({ where: { id: req.params.id as string }, data });
  res.json(customer);
});

// DELETE /customers/:id  (blocked if the customer has any challans; follow-ups cascade)
router.delete("/:id", canWrite, async (req, res) => {
  const challans = await prisma.challan.count({ where: { customerId: req.params.id as string } });
  if (challans) throw new AppError(409, "Cannot delete a customer that has challans");
  await prisma.customer.delete({ where: { id: req.params.id as string } });
  res.status(204).end();
});

// GET /customers/:id/followups
router.get("/:id/followups", async (req, res) => {
  const followups = await prisma.customerFollowup.findMany({
    where: { customerId: req.params.id as string },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.json(followups);
});

// POST /customers/:id/followups
router.post("/:id/followups", canWrite, validate(followupBody), async (req, res) => {
  const { note } = req.valid as z.infer<typeof followupBody>;
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id as string } });
  if (!customer) throw new AppError(404, "Customer not found");
  const followup = await prisma.customerFollowup.create({
    data: { note, customerId: req.params.id as string, createdById: req.user!.id },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.status(201).json(followup);
});

export default router;
