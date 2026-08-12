export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <button className="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span>
        Page {page} / {pages} · {total} total
      </span>
      <button className="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
