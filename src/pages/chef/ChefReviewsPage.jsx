import { useEffect, useState } from "react";
import { requestJson } from "../../lib/authApi.js";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import "../shared/ReviewsPage.css";
export default function ChefReviewsPage() {
  const [data, setData] = useState({ items: [], total: 0 }),
    [rating, setRating] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    requestJson(
      `/api/chef/reviews?offset=${page * 20}&limit=20${rating ? `&rating=${rating}` : ""}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, rating]);
  return (
    <ChefLayout title="Reviews">
      <main className="reviews-page">
        <h2>Guest feedback</h2>
        <p>
          Average rating: {data.average_rating ?? "—"} · {data.total} reviews
        </p>
        <div className="reviews-toolbar">
          <label>
            Rating{" "}
            <select
              value={rating}
              onChange={(e) => {
                setRating(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All</option>
              {[5, 4, 3, 2, 1].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="reviews-error">
            {error}
          </p>
        )}
        {data.items.map((r) => (
          <article className="reviews-card" key={r.id}>
            <strong>
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)} {r.food_name && `· ${r.food_name}`}
            </strong>
            <p>{r.content}</p>
            <small className="reviews-muted">
              {new Date(r.created_at).toLocaleDateString()}
            </small>
          </article>
        ))}
        {!error && !data.items.length && <p>No published feedback yet.</p>}
        <div className="reviews-pager">
          <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={(page + 1) * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </main>
    </ChefLayout>
  );
}
