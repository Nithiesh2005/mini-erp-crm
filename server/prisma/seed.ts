import bcrypt from "bcryptjs";
import { ChallanStatus, MovementType, Role } from "@prisma/client";
import prisma from "../src/config/prisma";

// Single demo password for every seeded user (documented in the README).
const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Users: one per role (idempotent) ---
  const users = await Promise.all(
    [
      { name: "Admin User", email: "admin@erp.test", role: Role.ADMIN },
      { name: "Sales User", email: "sales@erp.test", role: Role.SALES },
      { name: "Warehouse User", email: "warehouse@erp.test", role: Role.WAREHOUSE },
      { name: "Accounts User", email: "accounts@erp.test", role: Role.ACCOUNTS },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, passwordHash },
        create: { ...u, passwordHash },
      })
    )
  );
  const sales = users.find((u) => u.role === Role.SALES)!;
  const warehouse = users.find((u) => u.role === Role.WAREHOUSE)!;

  // Only seed demo data on a fresh DB, so re-running seed is safe.
  if ((await prisma.product.count()) > 0) {
    console.log("Demo data already present — seeded users only.");
    return;
  }

  // --- Customers (varied status / type) ---
  const [acme] = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Ravi Kumar",
        businessName: "Acme Distributors",
        mobile: "9800000001",
        email: "ravi@acme.test",
        gstNumber: "29ABCDE1234F1Z5",
        customerType: "DISTRIBUTOR",
        status: "ACTIVE",
        address: "12 Industrial Estate, Bengaluru",
      },
    }),
    prisma.customer.create({
      data: { name: "Priya Shah", businessName: "Bright Retail", mobile: "9800000002", customerType: "RETAIL", status: "ACTIVE" },
    }),
    prisma.customer.create({
      data: {
        name: "Imran Ali",
        businessName: "Metro Wholesale",
        mobile: "9800000003",
        customerType: "WHOLESALE",
        status: "LEAD",
        followUpDate: new Date("2026-09-01"),
        notes: "Requested bulk pricing for pipes.",
      },
    }),
    prisma.customer.create({
      data: { name: "Old Corp", businessName: "Old Corp Traders", customerType: "WHOLESALE", status: "INACTIVE" },
    }),
    prisma.customer.create({
      data: { name: "New Lead Traders", mobile: "9800000005", customerType: "RETAIL", status: "LEAD" },
    }),
  ]);
  const bright = await prisma.customer.findFirst({ where: { businessName: "Bright Retail" } });

  // --- Products (include stock at/below min_stock_alert) ---
  const p = async (data: {
    name: string;
    sku: string;
    category: string;
    unitPrice: number;
    currentStock: number;
    minStockAlert: number;
    location: string;
  }) => prisma.product.create({ data });

  const bolt = await p({ name: "Steel Bolt M6", sku: "SKU-1001", category: "Hardware", unitPrice: 2.5, currentStock: 500, minStockAlert: 100, location: "A1" });
  const wire = await p({ name: "Copper Wire 2mm", sku: "SKU-1002", category: "Electrical", unitPrice: 12, currentStock: 80, minStockAlert: 50, location: "B2" });
  await p({ name: "PVC Pipe 1in", sku: "SKU-1003", category: "Plumbing", unitPrice: 8, currentStock: 5, minStockAlert: 20, location: "C3" }); // LOW
  await p({ name: "LED Panel 20W", sku: "SKU-1004", category: "Electrical", unitPrice: 45, currentStock: 15, minStockAlert: 15, location: "B5" }); // AT threshold
  const nut = await p({ name: "Hex Nut M6", sku: "SKU-1005", category: "Hardware", unitPrice: 1, currentStock: 1000, minStockAlert: 200, location: "A2" });
  const led = await prisma.product.findUniqueOrThrow({ where: { sku: "SKU-1004" } });
  await p({ name: "Ball Valve 1in", sku: "SKU-1006", category: "Plumbing", unitPrice: 30, currentStock: 0, minStockAlert: 10, location: "C1" }); // LOW (zero)

  // --- Challans: one CONFIRMED (with stock deducted + OUT movements), one DRAFT ---
  // Confirmed challan CH-2026-0001 for Acme.
  await prisma.$transaction(async (tx) => {
    const items = [
      { product: bolt, quantity: 50 },
      { product: wire, quantity: 10 },
    ];
    await tx.challan.create({
      data: {
        challanNumber: "CH-2026-0001",
        customerId: acme.id,
        createdById: sales.id,
        status: ChallanStatus.CONFIRMED,
        totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        items: {
          create: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            productNameSnapshot: i.product.name,
            skuSnapshot: i.product.sku,
            unitPriceSnapshot: i.product.unitPrice,
          })),
        },
      },
    });
    for (const i of items) {
      await tx.product.update({ where: { id: i.product.id }, data: { currentStock: { decrement: i.quantity } } });
      await tx.stockMovement.create({
        data: {
          productId: i.product.id,
          quantityChanged: -i.quantity,
          movementType: MovementType.OUT,
          reason: "Challan CH-2026-0001 confirmed",
          createdById: sales.id,
        },
      });
    }
  });

  // Draft challan CH-2026-0002 for Bright Retail (no stock impact).
  await prisma.challan.create({
    data: {
      challanNumber: "CH-2026-0002",
      customerId: (bright ?? acme).id,
      createdById: sales.id,
      status: ChallanStatus.DRAFT,
      totalQuantity: 102,
      items: {
        create: [
          { productId: nut.id, quantity: 100, productNameSnapshot: nut.name, skuSnapshot: nut.sku, unitPriceSnapshot: nut.unitPrice },
          { productId: led.id, quantity: 2, productNameSnapshot: led.name, skuSnapshot: led.sku, unitPriceSnapshot: led.unitPrice },
        ],
      },
    },
  });

  // Counter reflects the two challans already issued this year.
  await prisma.counter.upsert({
    where: { id: "challan-2026" },
    update: { value: 2 },
    create: { id: "challan-2026", value: 2 },
  });

  // A manual stock-in movement so the audit log has a warehouse example.
  await prisma.stockMovement.create({
    data: { productId: bolt.id, quantityChanged: 100, movementType: MovementType.IN, reason: "Opening stock top-up", createdById: warehouse.id },
  });
  await prisma.product.update({ where: { id: bolt.id }, data: { currentStock: { increment: 100 } } });

  console.log("Seed complete. Login with password:", DEMO_PASSWORD);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
