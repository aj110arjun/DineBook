import { useEffect, useState } from "react";
import { requestJson } from "../../lib/authApi.js";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import "../shared/ReviewsPage.css";

export default function AdminReviewModerationPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [reasons, setReasons] = useState({});

  async function load() {
    try {
      const params = new URLSearchParams({ offset: String(page * 25), limit: "25", status: "PENDING", flagged_by: "MANAGER" });
      if (search.trim()) params.set("search", search.trim());
      setData(await requestJson(`/api/admin/reviews?${params}`));
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }

  useEffect(() => { load(); }, [page, search]);

  async function act(row, action) {
    const reason = reasons[row.review.id] || "";
    const detail = action === "DELETE"
      ? "This manager-flagged review will be removed from public display."
      : `Confirm ${action.toLowerCase().replace("_", " ")} for this review?`;
    if (!window.confirm(detail)) return;
    try {
      await requestJson(`/api/admin/reviews/${row.review.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, reason, flag_id: ["DISMISS_FLAG", "DELETE"].includes(action) ? row.flag_id : null }),
      });
      await load();
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <AdminLayout title="Review moderation">
      <main className="reviews-page admin-review-moderation">
        <header className="admin-review-heading"><h2>Flagged reviews</h2><p>{data.total} reviews need your attention</p></header>
        <div className="reviews-toolbar admin-review-filters">
          <input placeholder="Search flagged reviews" aria-label="Search flagged reviews" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} />
        </div>
        {error && <p role="alert" className="reviews-error">{error}</p>}
        {data.items.map((row) => {
          const canDelete = row.flagged_by === "MANAGER" && row.flag_status === "PENDING" && ["PUBLISHED", "HIDDEN"].includes(row.review.status);
          return <article className="reviews-card admin-review-card" key={row.flag_id}>
            <div className="reviews-row"><strong>{row.reason.replaceAll("_", " ")}</strong><small>{new Date(row.reported_at).toLocaleString()}</small></div>
            <p><b>{row.review.restaurant_name} · {row.review.rating}/5</b> — {row.review.content}</p>
            <p className="reviews-muted">Flagged by {row.reporter_name} · {row.explanation || "No explanation provided"} · Review by {row.review.customer_name}</p>
            {canDelete && <label className="admin-review-reason">Why should this review be removed?<textarea aria-label={`Reason for review ${row.review.id}`} value={reasons[row.review.id] || ""} onChange={(event) => setReasons({ ...reasons, [row.review.id]: event.target.value })} placeholder="Briefly explain the abusive or misleading content" /></label>}
            <div className="reviews-toolbar admin-review-actions">
              <button type="button" onClick={() => act(row, "DISMISS_FLAG")}>Keep review</button>
              {canDelete && <button type="button" disabled={(reasons[row.review.id] || "").trim().length < 8} onClick={() => act(row, "DELETE")}>Delete review</button>}
            </div>
          </article>;
        })}
        {!error && !data.items.length && <p>No reports match these filters.</p>}
        <div className="reviews-pager"><button disabled={!page} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={(page + 1) * 25 >= data.total} onClick={() => setPage((current) => current + 1)}>Next</button></div>
      </main>
    </AdminLayout>
  );
}
