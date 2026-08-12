import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import { useToast } from "../../components/Toast";
import type { Challan } from "../../api/types";

export default function ChallanDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const c = useFetch(() => api.get<Challan>(`/challans/${id}`).then((r) => r.data), [id]);
  const [busy, setBusy] = useState(false);

  const act = async (action: "confirm" | "cancel") => {
    setBusy(true);
    try {
      await api.post(`/challans/${id}/${action}`);
      show(`Challan ${action === "confirm" ? "confirmed" : "cancelled"}`, "success");
      c.reload();
    } catch (err) {
      show((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this challan? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.delete(`/challans/${id}`);
      show("Challan deleted", "success");
      nav("/challans");
    } catch (err) {
      show((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (c.loading) return <div className="state">Loading…</div>;
  if (c.error) return <div className="state error">{c.error}</div>;
  const ch = c.data!;
  const writable = can(user?.role, "challans_write");
  const amount = (ch.items || []).reduce((s, i) => s + i.unitPriceSnapshot * i.quantity, 0);

  return (
    <>
      <div className="page-head">
        <h1>
          {ch.challanNumber} <span className={`badge badge-${ch.status}`}>{ch.status}</span>
        </h1>
        {writable && (
          <div className="actions">
            {ch.status === "DRAFT" && (
              <button disabled={busy} onClick={() => act("confirm")}>
                Confirm
              </button>
            )}
            {ch.status !== "CANCELLED" && (
              <button className="secondary" disabled={busy} onClick={() => act("cancel")}>
                Cancel
              </button>
            )}
            {ch.status !== "CONFIRMED" && (
              <button className="danger" disabled={busy} onClick={del}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="detail-grid">
          <div>
            <span className="muted">Customer</span>
            <div>{ch.customer?.name || "—"}</div>
          </div>
          <div>
            <span className="muted">Created by</span>
            <div>{ch.createdBy?.name || "—"}</div>
          </div>
          <div>
            <span className="muted">Created</span>
            <div>{new Date(ch.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <span className="muted">Total quantity</span>
            <div>{ch.totalQuantity}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Items</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th className="num">Unit price</th>
                <th className="num">Qty</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(ch.items || []).map((it) => (
                <tr key={it.id}>
                  <td>{it.skuSnapshot}</td>
                  <td>{it.productNameSnapshot}</td>
                  <td className="num">{it.unitPriceSnapshot}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{it.unitPriceSnapshot * it.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="num">
                  <b>Total</b>
                </td>
                <td className="num">
                  <b>{amount}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted small">Item name / SKU / price are snapshots frozen when the challan was created.</p>
      </div>
    </>
  );
}
