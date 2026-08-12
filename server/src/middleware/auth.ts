import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { verifyToken } from "../lib/auth";
import { AppError } from "./error";

// Verifies the Bearer JWT and attaches the user to the request.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header");
  }
  try {
    req.user = verifyToken(header.slice(7));
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  next();
};

// Restricts a route to the given roles. Enforced in the BACKEND, not just UI.
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new AppError(401, "Unauthenticated");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
