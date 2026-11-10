import { formatLocalDateTime } from "../../lib/localDate.js";
import { confirmAction } from "../../lib/confirmDialog.js";
import { useEffect, useState } from "react";
import { requestJson } from "../../lib/authApi.js";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import "../../assets/css/ReviewsPage.css";

const flagReasons = ["ABUSIVE", "HARASSMENT", "MISLEADING", "SPAM", "OTHER"];
const flagStatuses = { PENDING: "Pending", RESOLVED: "Resolved", DISMISSED: "Dismissed" };

function splitReviewAtReportedQuotes(content, explanation) {
  const quotes = Array.from(
    (explanation || "").matchAll(/"([^"]+)"|“([^”]+)”/g),
    (match) => (match[1] ?? match[2]).trim(),
  ).filter((quote) => quote && content.includes(quote));

  if (!quotes.length) return [content];

  const alternatives = quotes
    .sort((first, second) => second.length - first.length)
    .map((quote) => quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return content.split(new RegExp("(" + alternatives.join("|") + ")"));
}

export default function AdminReviewModerationPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 25,
    search: "",
    status: "PENDING",
    reason: "",
    rating: "",
    sort: "oldest",
  });
  const [refresh, setRefresh] = useState(0);
  const [reasons, setReasons] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const { page, pageSize, search, status, reason, rating, sort } = query;
    const params = new URLSearchParams({
      offset: String((page - 1) * pageSize),
      limit: String(pageSize),
      flagged_by: "MANAGER",
      status,
      sort,
    });
    if (search.trim()) params.set("search", search.trim());
    if (reason) params.set("reason", reason);
    if (rating) params.set("rating", rating);

    setLoading(true);
    setError("");
    requestJson(`/api/admin/reviews?${params}`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage) {
          setQuery((current) =>
            current === query ? { ...current, page: lastPage } : current,
          );
          return;
        }
        setData(result);
        setLoading(false);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, refresh]);

  function changeFilter(key, value) {
    setActionError("");
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  }

  async function act(row, action) {
    const reason = reasons[row.review.id] || "";
    const detail =
      action === "DELETE"
        ? "This manager-flagged review will be removed from public display."
        : "Dismiss this flag and keep the review?";
    setBusy(true);
    setActionError("");
    try {
      if (!(await confirmAction(detail))) return;
      await requestJson(`/api/admin/reviews/${row.review.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action,
          reason,
          flag_id: row.flag_id,
        }),
      });
      setRefresh((current) => current + 1);
    } catch (reason) {
      setActionError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout title="Review moderation">
      <main className="reviews-page admin-review-moderation">
        <header className="admin-review-heading">
          <h2>Flagged reviews</h2>
          <p role="status">
            {loading
              ? "Loading flagged reviews…"
              : !error &&
                `${data.total} matching manager ${data.total === 1 ? "flag" : "flags"}`}
          </p>
        </header>
        <div className="reviews-toolbar admin-review-filters">
          <label>
            Search review text
            <input
              type="search"
              placeholder="Words from the review"
              maxLength={100}
              value={query.search}
              onChange={(event) => changeFilter("search", event.target.value)}
            />
          </label>
          <label>
            Flag status
            <select
              value={query.status}
              onChange={(event) => changeFilter("status", event.target.value)}
            >
              <option value="ALL">All statuses</option>
              {Object.entries(flagStatuses).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Flag reason
            <select
              value={query.reason}
              onChange={(event) => changeFilter("reason", event.target.value)}
            >
              <option value="">All reasons</option>
              {flagReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason[0] + reason.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Review rating
            <select
              value={query.rating}
              onChange={(event) => changeFilter("rating", event.target.value)}
            >
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} {rating === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              value={query.sort}
              onChange={(event) => changeFilter("sort", event.target.value)}
            >
              <option value="oldest">Oldest flags first</option>
              <option value="newest">Newest flags first</option>
              <option value="rating-low">Lowest rating first</option>
              <option value="rating-high">Highest rating first</option>
            </select>
          </label>
          <label>
            Flags per page
            <select
              value={query.pageSize}
              onChange={(event) => changeFilter("pageSize", Number(event.target.value))}
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
        {(error || actionError) && (
          <p role="alert" className="reviews-error">
            {error || actionError}
          </p>
        )}
        {!loading && !error && data.items.map((row) => {
          const { review } = row;
          const contentParts = splitReviewAtReportedQuotes(
            review.content,
            row.explanation,
          );
          const isPending = row.flag_status === "PENDING";
          const canDelete =
            isPending &&
            row.flagged_by === "MANAGER" &&
            ["PUBLISHED", "HIDDEN"].includes(review.status);
          return (
            <article
              className="reviews-card admin-review-card"
              key={row.flag_id}
            >
              <section className="admin-review-evidence">
                <h3>Review content</h3>
                <blockquote>
                  {contentParts.map((part, index) =>
                    index % 2 === 1 ? <mark key={index}>{part}</mark> : part,
                  )}
                </blockquote>
                <p className="admin-review-meta">
                  Review by {review.customer_name} ·{" "}
                  {review.restaurant_name || "Restaurant"} · {review.rating}/5
                  {review.food_name && <> · {review.food_name}</>}
                </p>
              </section>
              <section className="admin-review-report">
                <header>
                  <h3>Why it was flagged</h3>
                  <span className="admin-review-category">
                    {row.reason.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span className="admin-review-flag-status">
                    {flagStatuses[row.flag_status] || row.flag_status}
                  </span>
                </header>
                <p>
                  {row.explanation?.trim() ||
                    "The manager did not provide an explanation."}
                </p>
                <p className="admin-review-meta">
                  {contentParts.length > 1
                    ? "Highlighted text matches a quote in the report."
                    : "No specific passage could be matched to the report."}
                </p>
                <p className="admin-review-meta">
                  Flagged by {row.reporter_name} ·{" "}
                  <time dateTime={row.reported_at}>
                    {formatLocalDateTime(row.reported_at, { timeStyle: "medium" })}
                  </time>
                </p>
              </section>
              {canDelete && (
                <label className="admin-review-reason">
                  Removal reason (required to delete)
                  <textarea
                    value={reasons[row.review.id] || ""}
                    onChange={(event) =>
                      setReasons({
                        ...reasons,
                        [row.review.id]: event.target.value,
                      })
                    }
                    placeholder="Explain why this review should be removed"
                  />
                </label>
              )}
              {isPending && (
                <div className="reviews-toolbar admin-review-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(row, "DISMISS_FLAG")}
                  >
                    Keep review
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      disabled={busy || (reasons[row.review.id] || "").trim().length < 8}
                      onClick={() => act(row, "DELETE")}
                    >
                      Delete review
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!loading && !error && (
          data.total > 0 ? (
            <Pagination
              page={query.page}
              pageSize={query.pageSize}
              total={data.total}
              label={data.total === 1 ? "flag" : "flags"}
              onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
            />
          ) : <p>No reports match these filters.</p>
        )}
      </main>
    </AdminLayout>
  );
}
