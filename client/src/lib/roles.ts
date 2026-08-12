import type { Role } from "../api/types";

// UI-side mirror of the backend RBAC matrix. The backend is the source of
// truth (enforced in middleware); this only hides/disables forbidden actions.
const matrix = {
  customers_write: ["ADMIN", "SALES"],
  products_write: ["ADMIN", "WAREHOUSE"],
  challans_write: ["ADMIN", "SALES"],
} as const;

export type Action = keyof typeof matrix;

export const can = (role: Role | undefined, action: Action): boolean =>
  !!role && (matrix[action] as readonly string[]).includes(role);
