import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { Pagination } from "../../components/Pagination";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import { formatINR } from "../../lib/format";
import type { Paged, Product } from "../../api/types";

const LIMIT = 10;

export default function ProductsList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const q = useFetch(
    () =>
      api
        .get<Paged<Product>>("/products", { params: { search: search || undefined, page, limit: LIMIT } })
        .then((r) => r.data),
    [search, page]
  );

  return (
    <>
      <div className="page-head">
        <h1>Products</h1>
        {can(user?.role, "products_write") && (
          <Link className="btn" to="/products/new">
            + New product
          </Link>
        )}
      </div>

      <div className="toolbar">
        <input
          placeholder="Search name / SKU…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ maxWidth: 340 }}
        />
      </div>

      {q.loading ? (
        <div className="state">Loading…</div>
      ) : q.error ? (
        <div className="state error">{q.error}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th className="num">Min</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.data.map((p) => {
                const low = p.currentStock <= p.minStockAlert;
                return (
                  <tr key={p.id} className={low ? "low-stock" : ""}>
                    <td>{p.sku}</td>
                    <td className="name-cell">
                      <Link to={`/products/${p.id}`} title={p.name}>{p.name}</Link>
                    </td>
                    <td>{p.category || "—"}</td>
                    <td className="num">{formatINR(p.unitPrice)}</td>
                    <td className="num">
                      {p.currentStock}
                      {low && <span className="badge badge-low">LOW</span>}
                    </td>
                    <td className="num">{p.minStockAlert}</td>
                  </tr>
                );
              })}
              {q.data!.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {q.data && <Pagination page={page} limit={LIMIT} total={q.data.total} onPage={setPage} />}
    </>
  );
}
