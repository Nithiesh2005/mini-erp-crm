import type { NextFunction, Request, Response } from "express";

// Thrown anywhere in a route; the central handler turns it into a clean
// JSON error response. Express 5 auto-forwards throws from async handlers.
export class AppError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ error: { message: "Route not found" } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Prisma unique constraint -> 409 Conflict
  if (err?.code === "P2002") {
    const target = err.meta?.target;
    const field = Array.isArray(target) ? target[0] : target;
    return res.status(409).json({
      error: { message: `A record with this ${field ?? "value"} already exists`, field },
    });
  }
  // Prisma record-not-found (e.g. update/delete of missing row)
  if (err?.code === "P2025") {
    return res.status(404).json({ error: { message: "Record not found" } });
  }
  // Prisma foreign-key constraint -> 409 (still referenced by another record)
  if (err?.code === "P2003") {
    return res.status(409).json({ error: { message: "Cannot delete: this record is still referenced by others" } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.field ? { field: err.field } : {}) },
    });
  }
  // Unknown: log server-side, never leak internals to the client.
  console.error(err);
  return res.status(500).json({ error: { message: "Internal server error" } });
};
