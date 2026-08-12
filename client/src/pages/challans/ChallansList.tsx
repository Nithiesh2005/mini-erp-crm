import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { useFetch } from "../../lib/hooks";
import { Pagination } from "../../components/Pagination";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../lib/roles";
import type { Paged, Challan, ChallanStatus } from "../../api/types";

const LIMIT = 10;

export default function ChallansList() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"" | ChallanStatus>("");
  const [page, setPage] = useState(1);

  const q = useFetch(
    () =>
      api
        .get<Paged<Challan>>("/challans", { params: { status: status || undefined, page, limit: LIMIT } })
        .then((r) => r.data),
    [status, page]
  );

  return (
    <>
      <div className="page-head">
        <h1>Challans</h1>
        {can(user?.role, "challans_write") && (
          <Link className="btn" to="/challans/new">
            + New challan
          </Link>
        )}
      </div>

      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as "" | ChallanStatus);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
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
                <th>Challan #</th>
                <th>Customer</th>
                <th className="num">Qty</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {q.data!.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{c.customer?.name || "—"}</td>
                  <td className="num">{c.totalQuantity}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {q.data!.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No challans found.
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
