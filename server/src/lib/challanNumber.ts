import type { Prisma } from "@prisma/client";

// Collision-safe, human-readable challan numbers (CH-<year>-0001).
// Uses an atomic per-year counter row incremented INSIDE the caller's
// transaction — row-level locking serializes concurrent creates, so this is
// safe under load, unlike SELECT MAX(id)+1.
// ponytail: initial per-year row creation has a tiny create-create race; the
// seed pre-creates the current year's counter to avoid it in practice.
export async function nextChallanNumber(
  tx: Prisma.TransactionClient,
  year: number
): Promise<string> {
  const id = `challan-${year}`;
  const counter = await tx.counter.upsert({
    where: { id },
    update: { value: { increment: 1 } },
    create: { id, value: 1 },
  });
  return `CH-${year}-${String(counter.value).padStart(4, "0")}`;
}
