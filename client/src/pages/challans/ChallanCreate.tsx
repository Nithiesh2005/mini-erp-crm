import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { useToast } from "../../components/Toast";
import { Field } from "../../components/Field";
import type { Paged, Customer, Product, Challan } from "../../api/types";

type Line = { productId: string; quantity: number };

export default function ChallanCreate() {
  const nav = useNavigate();
  const { show } = useToast();
  const customers = useFetch(
    () => api.get<Paged<Customer>>("/customers", { params: { limit: 100 } }).then((r) => r.data.data),
    []
  );
  const products = useFetch(
    () => api.get<Paged<Product>>("/products", { params: { limit: 100 } }).then((r) => r.data.data),
    []
  );

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);

  const pmap = new Map((products.data || []).map((p) => [p.id, p]));

  const addLine = () => {
    const quantity = Number(qty);
    if (!pick || quantity < 1) return;
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === pick);
      if (existing) return ls.map((l) => (l.productId === pick ? { ...l, quantity: l.quantity + quantity } : l));
      return [...ls, { productId: pick, quantity }];
    });
    setPick("");
    setQty("1");
  };

  const removeLine = (productId: string) => setLines((ls) => ls.filter((l) => l.productId !== productId));

  const save = async (confirm: boolean) => {
    if (!customerId) return show("Pick a customer first", "error");
    if (lines.length === 0) return show("Add at least one product", "error");
    setBusy(true);
    try {
      const { data: challan } = await api.post<Challan>("/challans", { customerId, items: lines });
      if (confirm) {
        try {
          await api.post(`/challans/${challan.id}/confirm`);
          show(`${challan.challanNumber} confirmed`, "success");
        } catch (err) {
          // Draft was created; confirm failed (e.g. insufficient stock).
          show((err as Error).message, "error");
        }
      } else {
        show(`${challan.challanNumber} saved as draft`, "success");
      }
      nav(`/challans/${challan.id}`);
    } catch (err) {
      show((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const total = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <>
      <div className="page-head">
        <h1>New challan</h1>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <Field label="Customer">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer…</option>
            {(customers.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.businessName ? ` — ${c.businessName}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Add products</h3>
        <div className="inline-form">
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ minWidth: 260 }}>
            <option value="">Select a product…</option>
            {(products.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name} (stock {p.currentStock})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ maxWidth: 100 }}
          />
          <button type="button" onClick={addLine}>
            Add
          </button>
        </div>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th className="num">In stock</th>
                <th className="num">Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const p = pmap.get(l.productId);
                const short = p ? p.currentStock < l.quantity : false;
                return (
                  <tr key={l.productId} className={short ? "low-stock" : ""}>
                    <td>{p?.sku}</td>
                    <td>{p?.name}</td>
                    <td className="num">{p?.currentStock}</td>
                    <td className="num">{l.quantity}</td>
                    <td>
                      <button type="button" className="link-danger" onClick={() => removeLine(l.productId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No items added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted">Total quantity: {total}</p>
      </div>

      <div className="form-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => save(false)}>
          Save as draft
        </button>
        <button type="button" disabled={busy} onClick={() => save(true)}>
          Save &amp; confirm
        </button>
      </div>
      <p className="muted small">
        Confirming checks stock and deducts it. If any line is short, the challan stays a draft and nothing is deducted.
      </p>
    </>
  );
}
