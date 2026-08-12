import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { Field } from "../../components/Field";
import { useToast } from "../../components/Toast";
import type { Product } from "../../api/types";

type FormState = {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string;
  minStockAlert: string;
  location: string;
};

const empty: FormState = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "0",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { show } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    if (!id) return;
    api
      .get<Product>(`/products/${id}`)
      .then((r) => {
        const p = r.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category || "",
          unitPrice: String(p.unitPrice),
          currentStock: String(p.currentStock),
          minStockAlert: String(p.minStockAlert),
          location: p.location || "",
        });
      })
      .catch((e) => setErr((e as Error).message));
  }, [id]);

  const set = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    // currentStock is only sent on create (opening stock). Edits adjust stock
    // through movements, so it's excluded from the update payload.
    const base = {
      name: form.name,
      sku: form.sku,
      category: form.category || undefined,
      unitPrice: Number(form.unitPrice),
      minStockAlert: Number(form.minStockAlert),
      location: form.location || undefined,
    };
    try {
      if (id) await api.put(`/products/${id}`, base);
      else await api.post("/products", { ...base, currentStock: Number(form.currentStock) });
      show("Product saved", "success");
      nav(id ? `/products/${id}` : "/products");
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      show(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>{id ? "Edit" : "New"} product</h1>
      </div>
      <form className="panel" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name">
            <input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={set("sku")} required />
          </Field>
          <Field label="Category">
            <input value={form.category} onChange={set("category")} />
          </Field>
          <Field label="Unit price">
            <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={set("unitPrice")} required />
          </Field>
          {!id && (
            <Field label="Opening stock">
              <input type="number" min="0" value={form.currentStock} onChange={set("currentStock")} />
            </Field>
          )}
          <Field label="Min stock alert">
            <input type="number" min="0" value={form.minStockAlert} onChange={set("minStockAlert")} />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={set("location")} />
          </Field>
        </div>
        {id && <p className="muted small">Stock is adjusted from the product detail page (via stock movements).</p>}
        {err && <p className="field-error">{err}</p>}
        <div className="form-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="secondary" onClick={() => nav(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
