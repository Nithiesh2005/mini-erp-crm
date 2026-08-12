import type { Role } from "@prisma/client";

// Augment Express Request with the authenticated user (set by requireAuth)
// and the validated payload (set by the validate() middleware).
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; email: string };
      valid?: unknown;
    }
  }
}

export {};
