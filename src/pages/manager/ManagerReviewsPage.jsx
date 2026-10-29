import CustomForm from "../../components/forms/CustomForm.jsx";
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
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySaving, setReplySaving] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [flagging, setFlagging] = useState({});
  const [flagSaving, setFlagSaving] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [flagErrors, setFlagErrors] = useState({});
  const [flagForms, setFlagForms] = useState({});

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ offset: String(page * 20), limit: "20" });
    Object.entries(filter).forEach(([key, value]) => value && params.set(key, value));
    setLoading(true);
    setError("");
    requestJson(`/api/manager/reviews?${params}`)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filter, refresh]);

  function changeFilter(key, value) {
    setPage(0);
    setFilter((current) => ({ ...current, [key]: value }));
  }

  async function saveReply(event, id) {
    event.preventDefault();
    setReplySaving((current) => ({ ...current, [id]: true }));
    setReplyErrors((current) => ({ ...current, [id]: "" }));
    try {
      const reply = await requestJson(`/api/manager/reviews/${id}/reply`, {
        method: "PUT",
        body: JSON.stringify({ content: replyDrafts[id].trim() }),
      });
      setData((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, reply } : item,
        ),
      }));
      setRefresh((current) => current + 1);
      setReplyDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (reason) {
      setReplyErrors((current) => ({ ...current, [id]: reason.message }));
    } finally {
      setReplySaving((current) => ({ ...current, [id]: false }));
    }
  }

  async function flagReview(id) {
    const form = flagForms[id] || { reason: "ABUSIVE", explanation: "" };
    setFlagSaving((current) => ({ ...current, [id]: true }));
    setFlagErrors((current) => ({ ...current, [id]: "" }));
    try {
      await requestJson(`/api/manager/reviews/${id}/flags`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setData((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, manager_flag_pending: true } : item,
        ),
      }));
      setFlagging((current) => ({ ...current, [id]: false }));
      setRefresh((current) => current + 1);
      setFlagForms((current) => ({ ...current, [id]: undefined }));
      setError("");
    } catch (reason) {
      setFlagErrors((current) => ({ ...current, [id]: reason.message }));
    } finally {
      setFlagSaving((current) => ({ ...current, [id]: false }));
    }
  }
  const analytics = data.analytics;
  return (
    <ManagerLayout title="Reviews">
      <main className="reviews-page">
        <header>
          <h2>Review management</h2>
          <p>{data.total} reviews match your current filters.</p>
        </header>
        {analytics && (
          <section
            aria-label="Review analytics"
            className="manager-review-analytics"
          >
            <div className="manager-review-stats">
              {[
                ["Total reviews", analytics.total_reviews],
                ["Average rating", analytics.average_rating ?? "—"],
                ["Awaiting reply", analytics.unanswered_reviews],
                ["Replied", analytics.replied_reviews],
                ["Pending admin review", analytics.pending_flags],
              ].map(([label, value]) => (
                <div className="reviews-card" key={label}>
                  <span className="reviews-muted">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="reviews-card">
              <h3>Published rating breakdown</h3>

              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  analytics.rating_distribution[String(rating)] || 0;

                return (
                  <div className="manager-rating-row" key={rating}>
                    <span>{rating} ★</span>
                    <progress
                      aria-label={`${rating}-star reviews`}
                      value={count}
                      max={Math.max(1, analytics.published_reviews)}
                    />
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <div className="reviews-toolbar">
          <input
            aria-label="Search reviews"
            placeholder="Search review text"
            value={filter.search}
            onChange={(event) =>
              changeFilter("search", event.target.value)
            }
          />
          <select
            aria-label="Rating filter"
            value={filter.rating}
            onChange={(event) =>
              changeFilter("rating", event.target.value)
            }
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating}>{rating}</option>
            ))}
          </select>
          <select
            aria-label="Moderation status"
            value={filter.status}
            onChange={(event) =>
              changeFilter("status", event.target.value)
            }
          >
            <option value="">All statuses</option>
            {["PUBLISHED", "HIDDEN", "REJECTED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="reviews-error">
            {error}
          </p>
        )}
        {loading && <p role="status">Loading reviews…</p>}
        {!loading && !error && data.items.map((item) => (
          <article className="reviews-card" key={item.id}>
            <div className="reviews-row">
              <div>
                <strong>{item.customer_name || "Customer"}</strong>
                <p aria-label={`${item.rating} out of 5 stars`}>
                  {"★".repeat(item.rating)}
                  {"☆".repeat(5 - item.rating)}
                </p>
                {item.food_name && (
                  <small className="reviews-muted">
                    Item: {item.food_name}
                  </small>
                )}
                <p className="manager-review-content">{item.content}</p>
                {item.order_id && <p className="reviews-muted">Order: {item.order_id}</p>}
                <small className="reviews-muted">
                  {item.customer_name} ·{" "}
                  {new Date(item.created_at).toLocaleDateString()} ·{" "}
                  {item.status}
                </small>
              </div>
            </div>
            {item.reply && (
              <div className="manager-review-reply">
                <strong>Manager reply</strong>
                <p>{item.reply.content}</p>
                <small className="reviews-muted">
                  {new Date(item.reply.updated_at).toLocaleDateString()}
                </small>
              </div>
            )}
            {item.status === "PUBLISHED" &&
              (replyDrafts[item.id] !== undefined ? (
                <CustomForm onSubmit={(event) => saveReply(event, item.id)}>
                  <label htmlFor={`reply-${item.id}`}>
                    {item.reply ? "Edit reply" : "Reply to review"}
                  </label>
                  <textarea
                    id={`reply-${item.id}`}
                    required
                    minLength={3}
                    maxLength={2000}
                    disabled={replySaving[item.id]}
                    value={replyDrafts[item.id]}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <small className="reviews-muted">
                    Your reply will be visible to customers.{" "}
                    {replyDrafts[item.id].length}/2000
                  </small>
                  {replyErrors[item.id] && (
                    <p role="alert" className="reviews-error">
                      {replyErrors[item.id]}
                    </p>
                  )}
                  <div className="reviews-toolbar">
                    <button
                      type="submit"
                      disabled={
                        replySaving[item.id] ||
                        replyDrafts[item.id].trim().length < 3
                      }
                    >
                      {replySaving[item.id] ? "Saving…" : "Save reply"}
                    </button>
                    <button
                      type="button"
                      disabled={replySaving[item.id]}
                      onClick={() =>
                        setReplyDrafts((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </CustomForm>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setReplyDrafts((current) => ({
                      ...current,
                      [item.id]: item.reply?.content || "",
                    }))
                  }
                >
                  {item.reply ? "Edit reply" : "Reply to review"}
                </button>
              ))}
            {item.status === "PUBLISHED" && (
              <>
                {item.manager_flag_pending ? (
                  <p role="status" className="reviews-muted">
                    Flagged for administrator review.
                  </p>
                ) : flagging[item.id] ? (
                  <div className="customer-review-flag">
                    {flagErrors[item.id] && <p className="reviews-error" role="alert">{flagErrors[item.id]}</p>}
                    <label>
                      Reason
                      <select
                        disabled={flagSaving[item.id]}
                        value={(flagForms[item.id] || {}).reason || "ABUSIVE"}
                        onChange={(event) =>
                          setFlagForms({
                            ...flagForms,
                            [item.id]: {
                              ...(flagForms[item.id] || { explanation: "" }),
                              reason: event.target.value,
                            },
                          })
                        }
                      >
                        {flagReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason.charAt(0) + reason.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Why should an administrator review this?{" "}
                      <textarea
                        disabled={flagSaving[item.id]}
                        maxLength="1000"
                        value={(flagForms[item.id] || {}).explanation || ""}
                        onChange={(event) =>
                          setFlagForms({
                            ...flagForms,
                            [item.id]: {
                              ...(flagForms[item.id] || { reason: "ABUSIVE" }),
                              explanation: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <div className="reviews-toolbar">
                      <button type="button" disabled={flagSaving[item.id]} onClick={() => flagReview(item.id)}>
                        {flagSaving[item.id] ? "Submitting…" : "Send to admin"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={flagSaving[item.id]}
                        onClick={() => {
                          setFlagging({ ...flagging, [item.id]: false });
                          setFlagForms({ ...flagForms, [item.id]: undefined });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setFlagging({ ...flagging, [item.id]: true });
                      setFlagForms({
                        ...flagForms,
                        [item.id]: { reason: "ABUSIVE", explanation: "" },
                      });
                    }}
                  >
                    Flag for admin review
                  </button>
                )}
              </>
            )}
          </article>
        ))}
        {!loading && !error && !data.items.length && (
          <p>No restaurant reviews match these filters.</p>
        )}
        <div className="reviews-pager">
          <button
            disabled={loading || !page}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={loading || (page + 1) * 20 >= data.total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </main>
    </ManagerLayout>
  );
}
