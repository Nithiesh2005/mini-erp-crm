import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import { useToast } from "../../components/Toast";
import type { Customer, Followup } from "../../api/types";

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();
  const c = useFetch(() => api.get<Customer>(`/customers/${id}`).then((r) => r.data), [id]);
  const f = useFetch(() => api.get<Followup[]>(`/customers/${id}/followups`).then((r) => r.data), [id]);
  const [note, setNote] = useState("");

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.post(`/customers/${id}/followups`, { note });
      setNote("");
      show("Follow-up added", "success");
      f.reload();
    } catch (err) {
      show((err as Error).message, "error");
    }
  };

  const del = async () => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await api.delete(`/customers/${id}`);
      show("Customer deleted", "success");
      nav("/customers");
    } catch (err) {
      show((err as Error).message, "error");
    }
  };

  if (c.loading) return <div className="state">Loading…</div>;
  if (c.error) return <div className="state error">{c.error}</div>;
  const cust = c.data!;
  const writable = can(user?.role, "customers_write");

  return (
    <>
      <div className="page-head">
        <h1>
          {cust.name} <span className={`badge badge-${cust.status}`}>{cust.status}</span>
        </h1>
        {writable && (
          <div className="actions">
            <Link className="btn secondary" to={`/customers/${id}/edit`}>
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
            <span className="muted">Business</span>
            <div>{cust.businessName || "—"}</div>
          </div>
          <div>
            <span className="muted">Type</span>
            <div>{cust.customerType}</div>
          </div>
          <div>
            <span className="muted">Mobile</span>
            <div>{cust.mobile || "—"}</div>
          </div>
          <div>
            <span className="muted">Email</span>
            <div>{cust.email || "—"}</div>
          </div>
          <div>
            <span className="muted">Follow-up date</span>
            <div>{cust.followUpDate ? cust.followUpDate.slice(0, 10) : "—"}</div>
          </div>
        </div>
        {cust.address && (
          <p>
            <span className="muted">Address: </span>
            {cust.address}
          </p>
        )}
      </div>

      <div className="panel">
        <h3>Follow-ups</h3>
        {writable && (
          <form onSubmit={addNote} className="inline-form">
            <input placeholder="Add a follow-up note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="submit">Add</button>
          </form>
        )}
        {f.loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <ul className="timeline">
            {(f.data || []).map((x) => (
              <li key={x.id}>
                <div>{x.note}</div>
                <div className="muted small">
                  {new Date(x.createdAt).toLocaleString()}
                  {x.createdBy ? ` · ${x.createdBy.name}` : ""}
                </div>
              </li>
            ))}
            {(f.data || []).length === 0 && <li className="muted">No follow-ups yet.</li>}
          </ul>
        )}
      </div>
    </>
  );
}
