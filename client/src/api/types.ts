export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";
export type MovementType = "IN" | "OUT";
export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Followup {
  id: string;
  note: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export interface ChallanItem {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  productId: string;
}

export interface Challan {
  id: string;
  challanNumber: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdAt: string;
  customerId: string;
  customer?: Pick<Customer, "id" | "name">;
  createdBy?: { id: string; name: string };
  items?: ChallanItem[];
}

export interface Paged<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
