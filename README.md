# Mini ERP + CRM Operations Portal

A scoped-down but fully wired ERP + CRM for a wholesale/distribution business.
Manage customers and follow-ups, products and stock, and dispatch **challans**
(delivery notes) with real, transactional stock control and role-based access.

- **Backend:** Node.js + TypeScript + Express 5 + Prisma 7 (PostgreSQL) + JWT + zod
- **Frontend:** React 18 + TypeScript + Vite + react-router + axios (plain CSS, blue/white admin theme)

> **Repo layout note:** the brief suggested `/backend` + `/frontend`. This repo
> uses **`server/`** (backend) and **`client/`** (frontend) — same structure,
> different names — plus `docs/` and this root `README.md`.

```
mini-erp-crm/
├── server/        Express + Prisma API
│   ├── prisma/    schema, migration, seed
│   ├── src/       config, lib, middleware, routes
│   └── scripts/   smoke.ts (end-to-end money-path assertions)
├── client/        React + Vite SPA
│   └── src/       api, auth, components, lib, pages
├── docs/          ERD + Postman collection
└── package.json   root: one-command dev + db setup
```

---

## Architecture

The backend is a thin, layered REST API. `server.ts` validates the environment
and boots `app.ts`, which wires CORS, JSON parsing, health checks, the route
tree, and a **centralized error handler**. Each domain (`auth`, `customers`,
`products`, `challans`) is one router file with its zod schemas inline. Two
middlewares carry the cross-cutting concerns: `requireAuth` (verifies the JWT
and populates `req.user`) and `requireRole(...roles)` (RBAC). Prisma talks to
PostgreSQL through the Neon serverless driver adapter.

All stock-changing operations run inside **Prisma interactive transactions** so
they are all-or-nothing, and **every stock change writes a `StockMovement` row**
— the movement log is the append-only source of truth for inventory history.

The frontend is a single-page app. An axios instance attaches the bearer token,
normalizes API errors to a plain message, and bounces to `/login` on `401`. A
small `AuthContext` holds the token + user in `localStorage`; a `can(role,
action)` helper mirrors the backend RBAC matrix to hide/disable forbidden
actions (the backend remains the source of truth).

### ERD

```
┌──────────────┐        ┌────────────────────┐
│    User      │        │     Customer       │
│──────────────│        │────────────────────│
│ id (PK)      │        │ id (PK)            │
│ name         │        │ name               │
│ email  (UQ)  │        │ mobile             │
│ passwordHash │        │ email              │
│ role  (enum) │        │ businessName       │
│ createdAt    │        │ gstNumber          │
└──────┬───────┘        │ customerType(enum) │
       │                │ address            │
       │ createdBy      │ status (enum, IDX) │
       │                │ followUpDate       │
       │                │ notes              │
       │                └─────────┬──────────┘
       │                          │ 1
       │                          │
       │                          │ N
       │                ┌─────────┴──────────┐
       │                │ CustomerFollowup   │
       │                │────────────────────│
       │                │ id (PK)            │
       │                │ note               │
       │                │ customerId (FK)    │  ← ON DELETE CASCADE
       │                │ createdById (FK)   │
       │                │ createdAt          │
       │                └────────────────────┘
       │
       │        ┌──────────────────┐         ┌────────────────────┐
       │        │    Product       │ 1     N │   StockMovement    │
       │        │──────────────────│─────────│────────────────────│
       │        │ id (PK)          │         │ id (PK)            │
       │        │ name             │         │ quantityChanged    │  (+in / −out)
       │        │ sku (UQ, IDX)    │         │ movementType(enum) │
       │        │ category         │         │ reason             │
       │        │ unitPrice        │         │ productId (FK)     │
       │        │ currentStock     │◀────────│ createdById (FK)   │
       │        │  CHECK >= 0      │         │ createdAt          │
       │        │ minStockAlert    │         └────────────────────┘
       │        │ location         │
       │        └────────┬─────────┘
       │                 │ 1
       │                 │ N (snapshot at add time)
       │        ┌────────┴───────────┐        ┌────────────────────┐
       │        │   ChallanItem      │ N    1 │      Challan       │
       │        │────────────────────│────────│────────────────────│
       │        │ id (PK)            │        │ id (PK)            │
       │        │ productNameSnapshot│        │ challanNumber (UQ) │  CH-2026-0001
       │        │ skuSnapshot        │        │ totalQuantity      │
       │        │ unitPriceSnapshot  │        │ status (enum, IDX) │
       │        │ quantity           │        │ customerId(FK,IDX) │
       │        │ challanId (FK)     │  ←────  │ createdById (FK)   │◀── createdBy
       │        │ productId (FK)     │ CASCADE │ createdAt          │
       │        └────────────────────┘        │ updatedAt          │
       │                                       └────────────────────┘
       └── createdBy on: CustomerFollowup, StockMovement, Challan

Counter(id PK, value)   ← per-year row (e.g. "challan-2026") for collision-safe numbering
```

Full field list: [docs/erd.md](docs/erd.md).

### Enums

| Enum | Values |
|------|--------|
| `Role` | `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` |
| `CustomerType` | `RETAIL`, `WHOLESALE`, `DISTRIBUTOR` |
| `CustomerStatus` | `LEAD`, `ACTIVE`, `INACTIVE` |
| `MovementType` | `IN`, `OUT` |
| `ChallanStatus` | `DRAFT`, `CONFIRMED`, `CANCELLED` |

Challan status flow: `DRAFT → CONFIRMED → CANCELLED`. Only DRAFT deducts nothing;
confirm deducts stock; cancel restores it. A challan can be deleted while DRAFT or
CANCELLED, never while CONFIRMED.

---

## Environment variables

| Where     | Variable        | Example                                    | Notes |
|-----------|-----------------|--------------------------------------------|-------|
| `server/` | `DATABASE_URL`  | `postgresql://user:pass@host/db?sslmode=require` | PostgreSQL (Neon works out of the box) |
| `server/` | `JWT_SECRET`    | `a-long-random-string`                     | HS256 signing key |
| `server/` | `PORT`          | `5000`                                      | API port (default `5000`) |
| `client/` | `VITE_API_URL`  | `http://localhost:5000`                     | Base URL of the API |

Copy the examples and fill them in:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`.env` files are gitignored; only `.env.example` is committed.

---

## Run locally

**Prerequisites:** Node 18+ and a PostgreSQL database URL.

```bash
# 1. install root + server + client deps
npm run install:all

# 2. configure env (see table above)
cp server/.env.example server/.env      # then edit DATABASE_URL + JWT_SECRET
cp client/.env.example client/.env

# 3. create schema + seed demo data (users, customers, products, challans)
npm run db:setup

# 4. run API (:5000) and SPA (:5173) together
npm run dev
```

Open http://localhost:5173 and log in with a seed account below.

**Two-terminal alternative:**

```bash
npm --prefix server run dev      # terminal 1
npm --prefix client run dev      # terminal 2
```

**Verify the core stock logic** (with the API running):

```bash
npm run smoke
```

This asserts the money path end-to-end: draft → confirm decrements stock and
writes an OUT movement; an over-quantity confirm returns `400` and changes
**nothing**; cancel restores stock; challan numbers are unique and increasing.

---

## Seed logins

All four accounts use the password **`password123`**.

| Role      | Email               | Can do |
|-----------|---------------------|--------|
| Admin     | `admin@erp.test`    | Everything |
| Sales     | `sales@erp.test`    | Customers + follow-ups; create/edit/confirm/cancel challans; read products |
| Warehouse | `warehouse@erp.test`| Products + stock movements; read customers/challans |
| Accounts  | `accounts@erp.test` | Read-only on everything |

---

## Demo flow (2 minutes)

1. **Log in** as `sales@erp.test`. Land on the dashboard (KPIs: customers,
   low-stock products, draft challans).
2. **Products** → note the rows highlighted **LOW** (seeded below their min alert).
3. **Customers** → open one → add a **follow-up note** (timeline updates).
4. **Challans → New challan** → pick a customer → add a couple of products →
   **Save & confirm**. Stock is checked and deducted in one transaction.
5. Open a **product detail** → the **stock movements** table shows the OUT rows
   the confirm just wrote.
6. Create another challan with a **huge quantity** and Save & confirm → you get
   `Insufficient stock for SKU-xxxx: requested N, available M`, the challan stays
   a **draft**, and **no stock moved**.
7. Open a confirmed challan → **Cancel** → stock is restored via compensating IN
   movements.
8. Log out, log in as `accounts@erp.test` → all create/edit/confirm buttons are
   gone (read-only). Log in as `warehouse@erp.test` → can adjust stock but not
   touch challans.

---

## Business rules that are enforced

- **Draft has no stock impact.** Stock only moves on **confirm**.
- **Confirm is all-or-nothing.** If any line lacks stock, the whole confirm is
  rejected with a per-product message and nothing changes.
- **Stock can never go negative** — enforced in app logic *and* a DB
  `CHECK (currentStock >= 0)` constraint.
- **Every stock change is logged** as a `StockMovement` (challan confirm/cancel,
  manual adjustment, and product opening stock).
- **Challan numbers are collision-safe** — an atomic per-year `Counter` row
  incremented inside the create transaction, never `MAX(id)+1`.
- **Line items are snapshots** — name/SKU/price are frozen at add time, so later
  product edits never rewrite challan history.
- **Deletes are reference-safe.** A customer with challans, a product used on any
  challan, or a CONFIRMED challan cannot be deleted (409) — you must remove the
  dependents or cancel the challan first. Deleting a product also removes its own
  stock-movement log; deleting a customer or a draft challan cascades its
  follow-ups / line items.
- **RBAC is enforced in backend middleware** (the UI gating is convenience only).

---

## Deploy (Neon + Render + Vercel, free tier)

Config files are committed: [`render.yaml`](render.yaml) (API blueprint) and
[`client/vercel.json`](client/vercel.json) (SPA routing rewrite). The repo lives
on GitHub; both hosts deploy from it.

**1. Database — Neon** (already provisioned): copy the pooled connection string;
you'll paste it into Render as `DATABASE_URL`.

**2. API — Render** (from `render.yaml`):
- render.com → **New → Blueprint** → pick this repo. It reads `render.yaml`.
- Set **`DATABASE_URL`** (your Neon string). `JWT_SECRET` is auto-generated.
- The build runs `prisma generate → migrate deploy → tsc`. Start is `npm start`.
- **Seed once** after the first deploy — Render service → **Shell** →
  `npm run seed` (creates the 4 login users + demo data; idempotent).
- Note the API URL, e.g. `https://mini-erp-crm-api.onrender.com`.

**3. SPA — Vercel:**
- vercel.com → **Add New → Project** → this repo → set **Root Directory =
  `client`** (framework auto-detects Vite).
- Add env var **`VITE_API_URL`** = your Render API URL → **Deploy**.
- `vercel.json` rewrites all routes to `index.html` so deep links / refresh work.

CORS is open on the API (`cors()`), so the Vercel origin can call it as-is. The
free Render instance sleeps when idle — the first request after a nap takes a few
seconds to wake.

---

## Assumptions & limitations

- Repo uses `server/` + `client/` instead of `/backend` + `/frontend`.
- **Cancelling a confirmed challan** reverses stock with compensating IN
  movements (the challan is not deleted — history is preserved).
- **Product opening stock** set at creation is logged as an "Opening stock" IN
  movement; after that, stock changes only via movements or challans (the edit
  form intentionally cannot change `currentStock`).
- Dashboard low-stock KPI scans the first 100 products client-side (no dedicated
  count endpoint, and 100 is the API page cap) — fine at this scale; add
  `/products?low_stock=1` if the catalog grows.
- Seed data is idempotent: users are upserted; demo customers/products/challans
  are created only when the products table is empty.
- **Customer form is trimmed to rep-relevant fields** — name, business, mobile,
  email, type, status, follow-up date, address. `gstNumber` and `notes` are no
  longer collected or shown in the UI; the columns remain in the schema (existing
  data is preserved), so re-add the inputs if you need them later.
- **Bonuses not implemented:** Docker/compose, CI, PDF export, S3 uploads.

---

## API surface

Base URL `http://localhost:5000`. All non-auth routes require
`Authorization: Bearer <token>`. Errors are `{ error: { message, field? } }`;
list endpoints return `{ data, page, limit, total }`.

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| POST | `/auth/login` | public | body `{ email, password }` → `{ token, user }` |
| POST | `/auth/register` | admin | create a user with a role |
| GET  | `/auth/me` | any | current user from the token |
| GET  | `/customers` | any | `?search=&status=&page=&limit=` |
| POST | `/customers` | admin, sales | |
| GET/PUT | `/customers/:id` | read: any · write: admin, sales | |
| DELETE | `/customers/:id` | admin, sales | 409 if the customer has any challan; follow-ups cascade |
| GET/POST | `/customers/:id/followups` | read: any · write: admin, sales | |
| GET  | `/products` | any | `?search=&category=&page=&limit=` |
| POST | `/products` | admin, warehouse | opening stock logged as an IN movement |
| GET/PUT | `/products/:id` | read: any · write: admin, warehouse | PUT cannot change `currentStock` |
| DELETE | `/products/:id` | admin, warehouse | 409 if used on any challan; its stock log is removed with it |
| GET/POST | `/products/:id/stock-movements` | read: any · write: admin, warehouse | |
| GET  | `/challans` | any | `?status=&customer_id=&page=&limit=` |
| POST | `/challans` | admin, sales | created as DRAFT (no stock impact) |
| GET/PUT | `/challans/:id` | read: any · write: admin, sales | PUT only while DRAFT |
| DELETE | `/challans/:id` | admin, sales | DRAFT/CANCELLED only; 409 if CONFIRMED (cancel first) |
| POST | `/challans/:id/confirm` | admin, sales | all-or-nothing stock deduction |
| POST | `/challans/:id/cancel` | admin, sales | restores stock if it was confirmed |

A ready-to-import Postman collection is in
[docs/postman_collection.json](docs/postman_collection.json) — the login request
auto-saves the token for every other request.

### Error responses & status codes

Every error is `{ "error": { "message": string, "field"?: string } }`. Stack
traces and ORM internals are never sent to the client.

| Status | When |
|--------|------|
| `400` | zod validation failed (`field` names the bad input), or a business rule (e.g. insufficient stock) |
| `401` | missing/invalid/expired JWT — the SPA auto-redirects to `/login` |
| `403` | authenticated but the role may not perform this action |
| `404` | record or route not found |
| `409` | conflict: duplicate unique value (email/SKU), or a delete blocked because the row is still referenced |
| `500` | unexpected — logged server-side, generic message returned |

### Example requests

```bash
# Login → capture the token
curl -s localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@erp.test","password":"password123"}'
# → { "token": "eyJ...", "user": { "id": "...", "name": "Admin User", "role": "ADMIN" } }

# Use it on any protected route
curl -s localhost:5000/customers?limit=5 \
  -H "Authorization: Bearer $TOKEN"

# Confirm a challan (deducts stock, writes OUT movements)
curl -s -X POST localhost:5000/challans/<id>/confirm \
  -H "Authorization: Bearer $TOKEN"
# On shortage → 400 { "error": { "message": "Insufficient stock for SKU-1003: requested 50, available 12" } }
```

---

## Scripts reference

| Command | Runs in | What it does |
|---------|---------|--------------|
| `npm run install:all` | root | install root + server + client dependencies |
| `npm run db:setup` | root | `prisma migrate reset --force` then seed (drops + recreates tables, seeds users + demo data) |
| `npm run dev` | root | run API and SPA together (`concurrently`) |
| `npm run smoke` | root | end-to-end money-path assertions against the running API |
| `npm run dev` | `server/` | `predev` regenerates the Prisma client, then `tsx watch` (auto-reload) |
| `npm run build` / `start` | `server/` | `tsc` build → run `dist/server.js` |
| `npm run migrate` / `seed` / `generate` | `server/` | individual Prisma steps |
| `npm run dev` / `build` | `client/` | Vite dev server (`:5173`) / production build to `dist/` |

> `predev: prisma generate` on the server means every `npm run dev` regenerates
> the client from the current schema first — no stale-client boot crashes after a
> schema change.

Windows users can double-click **`setup-database.bat`** instead of running
`npm run db:setup` in a shell.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **"Network Error" on login** | API not running, or `VITE_API_URL` wrong | start the API (`npm run dev`); check `client/.env` points at `:5000` |
| **Boot crash: `Cannot convert undefined or null to object`** | stale Prisma client after a schema change | `npm --prefix server run generate` (or just `npm run dev` — `predev` does it) |
| **`P2022 … column does not exist`** on a query | DB schema older than the client | `npm run db:setup` to re-migrate |
| **`unknown or unexpected option: --skip-seed`** | Prisma 7 removed that flag | already fixed — the `migrate` script no longer passes it |
| **"Too big: expected number to be <=100"** | a list request asked for `limit > 100` (API cap) | request `limit ≤ 100` |
