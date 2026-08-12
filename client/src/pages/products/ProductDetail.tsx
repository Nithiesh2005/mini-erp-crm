import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import { formatINR } from "../../lib/format";
import { useToast } from "../../components/Toast";
import type { Product, StockMovement } from "../../api/types";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const p = useFetch(() => api.get<Product>(`/products/${id}`).then((r) => r.data), [id]);
  const m = useFetch(
    () => api.get<StockMovement[]>(`/products/${id}/stock-movements`).then((r) => r.data),
    [id]
  );
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const adjust = async (e: FormEvent) => {
    e.preventDefault();
    const quantityChanged = Number(qty);
    if (!quantityChanged || !reason.trim()) return;
    setBusy(true);
    try {
      await api.post(`/products/${id}/stock-movements`, { quantityChanged, reason });
      setQty("");
      setReason("");
      show("Stock adjusted", "success");
      p.reload();
      m.reload();
    } catch (err) {
      show((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (p.loading) return <div className="state">Loading…</div>;
  if (p.error) return <div className="state error">{p.error}</div>;
  const prod = p.data!;
  const low = prod.currentStock <= prod.minStockAlert;
  const writable = can(user?.role, "products_write");

  const del = async () => {
    if (!confirm("Delete this product? Its stock history is removed too.")) return;
    try {
      await api.delete(`/products/${id}`);
      show("Product deleted", "success");
      nav("/products");
    } catch (err) {
      show((err as Error).message, "error");
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>
          {prod.name} <span className="muted">({prod.sku})</span>
          {low && <span className="badge badge-low">LOW STOCK</span>}
        </h1>
        {writable && (
          <div className="actions">
            <Link className="btn secondary" to={`/products/${id}/edit`}>
              Edit
            </Link>
            <button className="danger" onClick={del}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="detail-grid">
          <div>
            <span className="muted">Category</span>
            <div>{prod.category || "—"}</div>
          </div>
          <div>
            <span className="muted">Unit price</span>
            <div>{formatINR(prod.unitPrice)}</div>
          </div>
          <div>
            <span className="muted">Current stock</span>
            <div>{prod.currentStock}</div>
          </div>
          <div>
            <span className="muted">Min stock alert</span>
            <div>{prod.minStockAlert}</div>
          </div>
          <div>
            <span className="muted">Location</span>
            <div>{prod.location || "—"}</div>
          </div>
        </div>
      </div>

      {writable && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3>Adjust stock</h3>
          <form onSubmit={adjust} className="inline-form">
            <input
              type="number"
              placeholder="+ in / − out"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button type="submit" disabled={busy}>
              Apply
            </button>
          </form>
          <p className="muted small">Positive adds stock (IN), negative removes (OUT). Stock can never go below 0.</p>
        </div>
      )}

      <div className="panel">
        <h3>Stock movements</h3>
        {m.loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="num">Change</th>
                  <th>Reason</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {(m.data || []).map((x) => (
                  <tr key={x.id}>
                    <td>{new Date(x.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${x.movementType}`}>{x.movementType}</span>
                    </td>
                    <td className="num">{x.quantityChanged > 0 ? `+${x.quantityChanged}` : x.quantityChanged}</td>
                    <td>{x.reason}</td>
                    <td>{x.createdBy?.name || "—"}</td>
                  </tr>
                ))}
                {(m.data || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No movements yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
