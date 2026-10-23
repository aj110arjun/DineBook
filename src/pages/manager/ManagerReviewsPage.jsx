import { useEffect, useState } from "react";
import { requestJson } from "../../lib/authApi.js";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import "../shared/ReviewsPage.css";

const flagReasons = ["ABUSIVE", "HARASSMENT", "MISLEADING", "SPAM", "OTHER"];

export default function ManagerReviewsPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState({ rating: "", status: "", search: "" });
  const [flagging, setFlagging] = useState({});
  const [flagForms, setFlagForms] = useState({});

  async function load() {
    try {
      const params = new URLSearchParams({ offset: String(page * 20), limit: "20" });
      Object.entries(filter).forEach(([key, value]) => value && params.set(key, value));
      setData(await requestJson(`/api/manager/reviews?${params}`));
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }

  useEffect(() => { load(); }, [page, filter]);

  async function flagReview(id) {
    const form = flagForms[id] || { reason: "ABUSIVE", explanation: "" };
    setFlagging((current) => ({ ...current, [id]: true }));
    try {
      await requestJson(`/api/manager/reviews/${id}/flags`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setData((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, manager_flag_pending: true } : item) }));
      setFlagForms((current) => ({ ...current, [id]: undefined }));
      setError("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setFlagging((current) => ({ ...current, [id]: false }));
    }
  }

  return (
    <ManagerLayout title="Reviews">
      <main className="reviews-page">
        <header>
          <h2>Review management</h2>
          <p>Average restaurant rating: {data.average_rating ?? "—"} · {data.total} reviews</p>
        </header>
        <div className="reviews-toolbar">
          <input aria-label="Search reviews" placeholder="Search review text" value={filter.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} />
          <select aria-label="Rating filter" value={filter.rating} onChange={(event) => setFilter({ ...filter, rating: event.target.value })}>
            <option value="">All ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating}>{rating}</option>)}
          </select>
          <select aria-label="Moderation status" value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}>
            <option value="">All statuses</option>{["PUBLISHED", "HIDDEN", "REJECTED"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="reviews-error">{error}</p>}
        {data.items.map((item) => (
          <article className="reviews-card" key={item.id}>
            <div className="reviews-row">
              <div>
                <strong>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)} · {item.restaurant_name}</strong>
                <p>{item.content}</p>
                <small className="reviews-muted">{item.customer_name} · {new Date(item.created_at).toLocaleDateString()} · {item.status}</small>
              </div>
            </div>
            {item.status === "PUBLISHED" && <>
              {item.manager_flag_pending ? <p role="status" className="reviews-muted">Flagged for administrator review.</p> : flagging[item.id] ? (
                <div className="customer-review-flag">
                  <label>Reason<select value={(flagForms[item.id] || {}).reason || "ABUSIVE"} onChange={(event) => setFlagForms({ ...flagForms, [item.id]: { ...(flagForms[item.id] || { explanation: "" }), reason: event.target.value } })}>{flagReasons.map((reason) => <option key={reason} value={reason}>{reason.charAt(0) + reason.slice(1).toLowerCase()}</option>)}</select></label>
                  <label>Why should an administrator review this? <textarea maxLength="1000" value={(flagForms[item.id] || {}).explanation || ""} onChange={(event) => setFlagForms({ ...flagForms, [item.id]: { ...(flagForms[item.id] || { reason: "ABUSIVE" }), explanation: event.target.value } })} /></label>
                  <div className="reviews-toolbar"><button type="button" onClick={() => flagReview(item.id)}>Send to admin</button><button type="button" className="secondary" onClick={() => { setFlagging({ ...flagging, [item.id]: false }); setFlagForms({ ...flagForms, [item.id]: undefined }); }}>Cancel</button></div>
                </div>
              ) : <button type="button" className="secondary" onClick={() => { setFlagging({ ...flagging, [item.id]: true }); setFlagForms({ ...flagForms, [item.id]: { reason: "ABUSIVE", explanation: "" } }); }}>Flag for admin review</button>}
            </>}
          </article>
        ))}
        {!error && !data.items.length && <p>No restaurant reviews match these filters.</p>}
        <div className="reviews-pager"><button disabled={!page} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={(page + 1) * 20 >= data.total} onClick={() => setPage((current) => current + 1)}>Next</button></div>
      </main>
    </ManagerLayout>
  );
}
