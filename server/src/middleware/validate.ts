import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "./error";

type Part = "body" | "query" | "params";

// Validates a request part against a zod schema. On success the parsed value
// (with coercions/defaults applied) is stored on req.valid for the handler.
// We do NOT reassign req.query — it is a read-only getter in Express 5.
export const validate =
  (schema: ZodType, part: Part = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first?.path.join(".") || undefined;
      throw new AppError(400, first?.message || "Validation failed", field);
    }
    req.valid = result.data;
    next();
  };
