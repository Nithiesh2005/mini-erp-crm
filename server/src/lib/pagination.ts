import { z } from "zod";

// Shared pagination query params for list endpoints.
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const pageResult = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => ({ data, page, limit, total });
