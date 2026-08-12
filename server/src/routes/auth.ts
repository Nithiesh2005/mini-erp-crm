import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import prisma from "../config/prisma";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { comparePassword, hashPassword, signToken } from "../lib/auth";

const router = Router();

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(Role),
});

// POST /auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.valid as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /auth/register  (admin-only; the seed script also creates users)
router.post(
  "/register",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(registerSchema),
  async (req, res) => {
    const { name, email, password, role } = req.valid as z.infer<
      typeof registerSchema
    >;
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role },
      select: publicUser,
    });
    res.status(201).json(user);
  }
);

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: publicUser,
  });
  if (!user) throw new AppError(404, "User not found");
  res.json(user);
});

export default router;
