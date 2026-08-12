import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { Pagination } from "../../components/Pagination";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import type { Paged, Customer, CustomerStatus } from "../../api/types";

const LIMIT = 10;

export default function CustomersList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | CustomerStatus>("");
  const [page, setPage] = useState(1);

  const q = useFetch(
    () =>
      api
        .get<Paged<Customer>>("/customers", {
          params: { search: search || undefined, status: status || undefined, page, limit: LIMIT },
        })
        .then((r) => r.data),
    [search, status, page]
  );

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        {can(user?.role, "customers_write") && (
          <Link className="btn" to="/customers/new">
            + New customer
          </Link>
        )}
      </div>

      <div className="toolbar">
        <input
          placeholder="Search name / business / email / mobile…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ maxWidth: 340 }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as "" | CustomerStatus);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
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
                <th>Name</th>
                <th>Business</th>
                <th>Type</th>
                <th>Status</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.businessName || "—"}</td>
                  <td>{c.customerType}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td>{c.mobile || "—"}</td>
                </tr>
              ))}
              {q.data!.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No customers found.
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
