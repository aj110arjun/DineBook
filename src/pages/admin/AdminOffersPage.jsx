import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminOffersPage() {
  const [tab, setTab] = useState("offers");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountType, setDiscountType] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const endpoint =
      tab === "offers"
        ? "/api/admin/orders/offers"
        : "/api/admin/orders/offer-redemptions";
    const params = new URLSearchParams({
      limit: "25",
      offset: String(page * 25),
      search,
    });
    if (status && tab === "offers") params.set("status", status);
    if (restaurantId) params.set("restaurant_id", restaurantId);
    if (discountType && tab === "offers")
      params.set("discount_type", discountType);
    if (validFrom && tab === "offers")
      params.set("valid_from", new Date(`${validFrom}T00:00:00`).toISOString());
    if (validTo && tab === "offers")
      params.set("valid_to", new Date(`${validTo}T23:59:59`).toISOString());
    requestJson(`${endpoint}?${params}`)
      .then((data) => {
        if (active) {
          setRows(data.items || []);
          setTotal(data.total || 0);
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [
    tab,
    search,
    status,
    page,
    discountType,
    restaurantId,
    validFrom,
    validTo,
  ]);
  const visible = rows;
  return (
    <AdminLayout title="Offer oversight" activePath="/admin/offers">
      <section className="admin-offers">
        <div className="admin-offers-intro">
          <span>PLATFORM OVERSIGHT · READ ONLY</span>
          <h2>Offers & redemptions</h2>
          <p>
            Review restaurant offers and their redemption records. This view
            cannot change offer configuration.
          </p>
        </div>
        <div className="admin-offers-controls">
          <input
            aria-label="Search offers"
            placeholder="Search title, code or restaurant"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <button
            className={tab === "offers" ? "selected" : ""}
            onClick={() => {
              setTab("offers");
              setPage(0);
            }}
          >
            Offers
          </button>
          <button
            className={tab === "redemptions" ? "selected" : ""}
            onClick={() => {
              setTab("redemptions");
              setPage(0);
            }}
          >
            Redemptions
          </button>
          <input
            aria-label="Restaurant ID filter"
            placeholder="Restaurant ID"
            value={restaurantId}
            onChange={(e) => {
              setRestaurantId(e.target.value);
              setPage(0);
            }}
          />
          {tab === "offers" && (
            <>
              <select
                aria-label="Offer status filter"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All statuses</option>
                {[
                  "ACTIVE",
                  "SCHEDULED",
                  "EXPIRED",
                  "INACTIVE",
                  "EXHAUSTED",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Discount type filter"
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All discount types</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
              <input
                aria-label="Valid from"
                type="date"
                value={validFrom}
                onChange={(e) => {
                  setValidFrom(e.target.value);
                  setPage(0);
                }}
              />
              <input
                aria-label="Valid to"
                type="date"
                value={validTo}
                onChange={(e) => {
                  setValidTo(e.target.value);
                  setPage(0);
                }}
              />
            </>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p>Loading records…</p>
        ) : (
          <div className="admin-offers-table-wrap">
            <table>
              <thead>
                <tr>
                  {tab === "offers" ? (
                    <>
                      <th>Offer</th>
                      <th>Restaurant</th>
                      <th>Discount</th>
                      <th>Scope</th>
                      <th>Redemptions</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </>
                  ) : (
                    <>
                      <th>Redemption ID</th>
                      <th>Offer</th>
                      <th>Restaurant ID</th>
                      <th>Customer ref</th>
                      <th>Order</th>
                      <th>Discount</th>
                      <th>Status / time</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    {tab === "offers" ? (
                      <>
                        <td>
                          <b>{r.title}</b>
                          <small>{r.code}</small>
                        </td>
                        <td>{r.restaurant_name}</td>
                        <td>
                          {r.discount_type === "PERCENTAGE"
                            ? `${r.discount_percent}%`
                            : `₹${Number(r.discount_percent).toFixed(2)}`}
                        </td>
                        <td>{r.applicability}</td>
                        <td>
                          {r.uses}
                          {r.max_uses ? ` / ${r.max_uses}` : " / ∞"}
                        </td>
                        <td>{r.status}</td>
                        <td>
                          {r.updated_at
                            ? new Date(r.updated_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{r.id}</td>
                        <td>
                          {r.offer_title}
                          <small>{r.offer_code}</small>
                        </td>
                        <td>{r.restaurant_id}</td>
                        <td>{r.customer_id || "Guest"}</td>
                        <td>{r.order_id}</td>
                        <td>₹{Number(r.discount_amount).toFixed(2)}</td>
                        <td>
                          {r.status}
                          <small>
                            {new Date(r.created_at).toLocaleString()}
                          </small>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan="7">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {total > 25 && (
          <div className="offers-pagination">
            <span>
              {page * 25 + 1}–{Math.min((page + 1) * 25, total)} of {total}
            </span>
            <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              disabled={(page + 1) * 25 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
