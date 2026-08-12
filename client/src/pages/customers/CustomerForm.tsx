import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { Field } from "../../components/Field";
import { useToast } from "../../components/Toast";
import type { Customer } from "../../api/types";

type FormState = {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  customerType: string;
  address: string;
  status: string;
  followUpDate: string;
};

const empty: FormState = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
};

export default function CustomerForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { show } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    if (!id) return;
    api
      .get<Customer>(`/customers/${id}`)
      .then((r) => {
        const c = r.data;
        setForm({
          name: c.name,
          mobile: c.mobile || "",
          email: c.email || "",
          businessName: c.businessName || "",
          customerType: c.customerType,
          address: c.address || "",
          status: c.status,
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
        });
      })
      .catch((e) => setErr((e as Error).message));
  }, [id]);

  const set =
    (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const payload: Record<string, string> = { ...form };
    // Optional fields left blank are omitted rather than sent as "".
    for (const k of Object.keys(payload)) if (payload[k] === "") delete payload[k];
    try {
      if (id) await api.put(`/customers/${id}`, payload);
      else await api.post("/customers", payload);
      show("Customer saved", "success");
      nav(id ? `/customers/${id}` : "/customers");
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
        <h1>{id ? "Edit" : "New"} customer</h1>
      </div>
      <form className="panel" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Name">
            <input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="Business name">
            <input value={form.businessName} onChange={set("businessName")} />
          </Field>
          <Field label="Mobile">
            <input value={form.mobile} onChange={set("mobile")} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Type">
            <select value={form.customerType} onChange={set("customerType")}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Follow-up date">
            <input type="date" value={form.followUpDate} onChange={set("followUpDate")} />
          </Field>
        </div>
        <Field label="Address">
          <textarea value={form.address} onChange={set("address")} />
        </Field>
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
