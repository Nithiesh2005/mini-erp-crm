# Data model (ERD)

PostgreSQL via Prisma 7. Enums are native Postgres enums. `createdBy` on
`CustomerFollowup`, `StockMovement`, and `Challan` references `User`.

## Enums

| Enum | Values |
|------|--------|
| `Role` | `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` |
| `CustomerType` | `RETAIL`, `WHOLESALE`, `DISTRIBUTOR` |
| `CustomerStatus` | `LEAD`, `ACTIVE`, `INACTIVE` |
| `MovementType` | `IN`, `OUT` |
| `ChallanStatus` | `DRAFT`, `CONFIRMED`, `CANCELLED` |

## Tables

### User
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| name | text | |
| email | text | **unique**, indexed |
| passwordHash | text | bcrypt |
| role | Role | |
| createdAt | timestamptz | |

### Customer
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| name | text | |
| mobile | text | nullable |
| email | text | nullable |
| businessName | text | nullable |
| gstNumber | text | nullable |
| customerType | CustomerType | default `RETAIL` |
| address | text | nullable |
| status | CustomerStatus | default `LEAD`, **indexed** |
| followUpDate | timestamptz | nullable |
| notes | text | nullable |
| createdAt / updatedAt | timestamptz | |

### CustomerFollowup
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| note | text | |
| customerId | text | FK → Customer, **ON DELETE CASCADE**, indexed |
| createdById | text | FK → User |
| createdAt | timestamptz | |

### Product
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| name | text | |
| sku | text | **unique**, indexed |
| category | text | nullable |
| unitPrice | double precision | |
| currentStock | integer | **CHECK (currentStock >= 0)** |
| minStockAlert | integer | low-stock threshold |
| location | text | nullable |
| createdAt / updatedAt | timestamptz | |

### StockMovement (append-only log)
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| quantityChanged | integer | signed: **+** for IN, **−** for OUT |
| movementType | MovementType | |
| reason | text | e.g. "Challan CH-2026-0001 confirmed", "Opening stock" |
| productId | text | FK → Product, indexed |
| createdById | text | FK → User |
| createdAt | timestamptz | |

### Challan
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| challanNumber | text | **unique**, format `CH-<year>-####` |
| totalQuantity | integer | sum of item quantities |
| status | ChallanStatus | default `DRAFT`, **indexed** |
| customerId | text | FK → Customer, **indexed** |
| createdById | text | FK → User |
| createdAt / updatedAt | timestamptz | |

### ChallanItem (snapshots)
| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | PK |
| productNameSnapshot | text | frozen at add time |
| skuSnapshot | text | frozen at add time |
| unitPriceSnapshot | double precision | frozen at add time |
| quantity | integer | |
| challanId | text | FK → Challan, **ON DELETE CASCADE**, indexed |
| productId | text | FK → Product |

### Counter (collision-safe numbering)
| Column | Type | Notes |
|--------|------|-------|
| id | text | PK, e.g. `challan-2026` |
| value | integer | last-used sequence number |

Incremented atomically inside the challan-create transaction (row lock
serializes concurrent creates) — never `MAX(id)+1`.
