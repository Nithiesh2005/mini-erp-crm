/**
 * End-to-end smoke check for the stock/challan invariants.
 * Requires the API running (npm run dev) and a seeded DB.
 *   npm run smoke
 * Creates its own throwaway product/customer/challans so it is repeatable.
 */
import assert from "node:assert/strict";

const BASE = process.env.API_URL || "http://localhost:5000";

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  // Log in as admin (full access).
  const login = await api("POST", "/auth/login", { email: "admin@erp.test", password: "password123" });
  assert.equal(login.status, 200, "admin login should succeed");
  const token = login.json.token as string;
  assert.ok(token, "login returns a token");

  const tag = Date.now();

  // Fixtures: product with 10 units, a customer.
  const prod = await api("POST", "/products", { name: `Smoke Widget ${tag}`, sku: `SMOKE-${tag}`, unitPrice: 5, currentStock: 10, minStockAlert: 2 }, token);
  assert.equal(prod.status, 201, "create product");
  const productId = prod.json.id as string;

  const cust = await api("POST", "/customers", { name: `Smoke Customer ${tag}` }, token);
  assert.equal(cust.status, 201, "create customer");
  const customerId = cust.json.id as string;

  // Draft challan for 4 units, then confirm -> stock 10 -> 6.
  const c1 = await api("POST", "/challans", { customerId, items: [{ productId, quantity: 4 }] }, token);
  assert.equal(c1.status, 201, "create draft challan");
  const challan1 = c1.json.id as string;
  const number1 = c1.json.challanNumber as string;

  const confirm1 = await api("POST", `/challans/${challan1}/confirm`, undefined, token);
  assert.equal(confirm1.status, 200, "confirm with sufficient stock");

  let after = await api("GET", `/products/${productId}`, undefined, token);
  assert.equal(after.json.currentStock, 6, "stock reduced by 4");

  const movesAfterConfirm = await api("GET", `/products/${productId}/stock-movements`, undefined, token);
  assert.ok(
    movesAfterConfirm.json.some((m: any) => m.quantityChanged === -4 && m.movementType === "OUT"),
    "an OUT movement of -4 was logged"
  );
  const moveCount = movesAfterConfirm.json.length;

  // Insufficient stock: request 999 -> confirm must 400 and change NOTHING.
  const c2 = await api("POST", "/challans", { customerId, items: [{ productId, quantity: 999 }] }, token);
  const challan2 = c2.json.id as string;
  const number2 = c2.json.challanNumber as string;

  const confirm2 = await api("POST", `/challans/${challan2}/confirm`, undefined, token);
  assert.equal(confirm2.status, 400, "confirm with insufficient stock is rejected");
  assert.match(confirm2.json.error.message, /Insufficient stock/, "clear per-product message");

  after = await api("GET", `/products/${productId}`, undefined, token);
  assert.equal(after.json.currentStock, 6, "stock UNCHANGED after failed confirm (all-or-nothing)");
  const movesAfterFail = await api("GET", `/products/${productId}/stock-movements`, undefined, token);
  assert.equal(movesAfterFail.json.length, moveCount, "no movement rows written on failed confirm");

  // Cancel the confirmed challan -> stock restored to 10 via a compensating IN.
  const cancel1 = await api("POST", `/challans/${challan1}/cancel`, undefined, token);
  assert.equal(cancel1.status, 200, "cancel confirmed challan");
  after = await api("GET", `/products/${productId}`, undefined, token);
  assert.equal(after.json.currentStock, 10, "stock restored after cancel");

  // Challan numbers are sequential + unique.
  assert.notEqual(number1, number2, "challan numbers are unique");
  assert.ok(number1 < number2, "challan numbers increase");

  console.log("✅ smoke passed:", { number1, number2 });
}

main().catch((e) => {
  console.error("❌ smoke failed:", e.message);
  process.exit(1);
});
