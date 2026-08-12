import { Link } from "react-router-dom";
import api from "../api/client";
import { useFetch } from "../lib/hooks";
import type { Paged, Customer, Product, Challan } from "../api/types";

// KPIs: total customers, low-stock products, draft challans.
// ponytail: low-stock scans first 100 products client-side (the API page cap;
// no count endpoint). Add a dedicated /products?low_stock=1 count if the
// catalog outgrows one page.
export default function Dashboard() {
  const s = useFetch(async () => {
    const [cust, prods, drafts] = await Promise.all([
      api.get<Paged<Customer>>("/customers", { params: { limit: 1 } }),
      api.get<Paged<Product>>("/products", { params: { limit: 100 } }),
      api.get<Paged<Challan>>("/challans", { params: { status: "DRAFT", limit: 1 } }),
    ]);
    const low = prods.data.data.filter((p) => p.currentStock <= p.minStockAlert).length;
    return { customers: cust.data.total, lowStock: low, drafts: drafts.data.total };
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>
      {s.loading ? (
        <div className="state">Loading…</div>
      ) : s.error ? (
        <div className="state error">{s.error}</div>
      ) : (
        <div className="kpis">
          <Link to="/customers" className="kpi">
            <div className="num">{s.data!.customers}</div>
            <div className="label">Total customers</div>
          </Link>
          <Link to="/products" className="kpi">
            <div className="num">{s.data!.lowStock}</div>
            <div className="label">Low-stock products</div>
          </Link>
          <Link to="/challans" className="kpi">
            <div className="num">{s.data!.drafts}</div>
            <div className="label">Draft challans</div>
          </Link>
        </div>
      )}
    </>
  );
}
