import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Plus, Search, RefreshCw } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import CustomDatePicker from "../../components/CustomDatePicker.jsx";
import { requestJson } from "../../lib/authApi.js";

const blank = {
  title: "",
  description: "",
  code: "",
  discount_type: "PERCENTAGE",
  discount_percent: "",
  minimum_subtotal: "0",
  max_discount: "",
  max_uses: "",
  per_customer_limit: "",
  starts_at: "",
  ends_at: "",
  applicability: "RESTAURANT",
  eligible_food_ids: [],
  eligible_category_ids: [],
};
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const localDateToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const localDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function ManagerOffersPage() {
  const [offers, setOffers] = useState([]);
  const [menu, setMenu] = useState([]);
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [redemptionView, setRedemptionView] = useState(null);
  const [sort, setSort] = useState("created_at");
  const [discountFilter, setDiscountFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: String(page * 20),
        limit: "20",
        sort,
      });
      if (query.trim()) params.set("search", query.trim());
      if (status !== "ALL") params.set("status", status);
      if (discountFilter !== "ALL") params.set("discount_type", discountFilter);
      if (scopeFilter !== "ALL") params.set("applicability", scopeFilter);
      if (validFrom)
        params.set(
          "valid_from",
          new Date(`${validFrom}T00:00:00`).toISOString(),
        );
      if (validTo)
        params.set("valid_to", new Date(`${validTo}T23:59:59`).toISOString());
      const [data, menuData] = await Promise.all([
        requestJson(`/api/manager/orders/offers?${params}`),
        requestJson("/api/manager/menu"),
      ]);
      setOffers(data.items || []);
      setTotal(data.total || 0);
      setMenu(menuData);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    query,
    status,
    sort,
    discountFilter,
    scopeFilter,
    validFrom,
    validTo,
  ]);
  useEffect(() => {
    load();
  }, [load]);
  const foods = useMemo(
    () =>
      menu.flatMap((c) =>
        (c.foods || []).map((f) => ({ ...f, category_name: c.name })),
      ),
    [menu],
  );
  const filtered = offers;
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(event) {
    event.preventDefault();
    if (form.starts_at && form.starts_at < localDateToday()) {
      setError("The offer start date cannot be in the past.");
      return;
    }
    if (form.ends_at && form.ends_at < localDateToday()) {
      setError("The offer end date cannot be in the past.");
      return;
    }
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) {
      setError("The end date must be the same as or later than the start date.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const body = {
      ...form,
      discount_percent: Number(form.discount_percent),
      minimum_subtotal: Number(form.minimum_subtotal || 0),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      per_customer_limit: form.per_customer_limit
        ? Number(form.per_customer_limit)
        : null,
      starts_at: form.starts_at ? new Date(`${form.starts_at}T00:00:00`).toISOString() : null,
      ends_at: form.ends_at ? new Date(`${form.ends_at}T23:59:59.999`).toISOString() : null,
      timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    try {
      await requestJson(
        form.id
          ? `/api/manager/orders/offers/${form.id}`
          : "/api/manager/orders/offers",
        { method: form.id ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setForm(null);
      setNotice("Offer saved.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(offer) {
    const action = offer.is_active ? "deactivate" : "activate";
    if (
      !window.confirm(
        `${action[0].toUpperCase()}${action.slice(1)} ${offer.title}?`,
      )
    )
      return;
    try {
      await requestJson(
        `/api/manager/orders/offers/${offer.id}?is_active=${!offer.is_active}`,
        { method: "PATCH" },
      );
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function showRedemptions(offer) {
    try {
      const data = await requestJson(
        `/api/manager/orders/offers/${offer.id}/redemptions?limit=100`,
      );
      setRedemptionView({ offer, rows: data.items || [] });
    } catch (e) {
      setError(e.message);
    }
  }
  function edit(o) {
    setForm({
      ...blank,
      ...o,
      discount_percent: o.discount_percent,
      minimum_subtotal: o.minimum_subtotal,
      max_discount: o.max_discount || "",
      max_uses: o.max_uses || "",
      per_customer_limit: o.per_customer_limit || "",
      starts_at: localDateInput(o.starts_at),
      ends_at: localDateInput(o.ends_at),
    });
  }
  return (
    <ManagerLayout title="Offers">
      <section className="offers-page">
        <div className="offers-heading">
          <div>
            <span>GROW REPEAT VISITS</span>
            <h2>Offers & discounts</h2>
            <p>
              Create one-off discounts for your menu. Only one offer can be used
              per order.
            </p>
          </div>
          <button onClick={() => setForm({ ...blank })}>
            <Plus size={17} /> Create offer
          </button>
        </div>
        {error && (
          <p role="alert" className="offer-alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="offer-notice">
            {notice}
          </p>
        )}
        <div className="offers-toolbar">
          <label>
            <Search size={16} />
            <input
              placeholder="Search title or code"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All statuses</option>
            {["ACTIVE", "SCHEDULED", "EXPIRED", "EXHAUSTED", "INACTIVE"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <select
            aria-label="Filter discount type"
            value={discountFilter}
            onChange={(e) => {
              setDiscountFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All discount types</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
          <select
            aria-label="Filter applicability"
            value={scopeFilter}
            onChange={(e) => {
              setScopeFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All scopes</option>
            <option value="RESTAURANT">Restaurant</option>
            <option value="ITEMS">Items</option>
            <option value="CATEGORIES">Categories</option>
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
          <select
            aria-label="Sort offers"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="created_at">Creation date</option>
            <option value="discount_value">Discount value</option>
            <option value="starts_at">Start date</option>
            <option value="ends_at">Expiry date</option>
          </select>
          <button onClick={load} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
        {loading ? (
          <p>Loading offers…</p>
        ) : filtered.length === 0 ? (
          <div className="offers-empty">
            <Tag />
            <h3>No offers found</h3>
            <p>Create an offer to give customers a reason to come back.</p>
          </div>
        ) : (
          <div className="offers-table-wrap">
            <table className="offers-table">
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Discount</th>
                  <th>Applies to</th>
                  <th>Redemptions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.title}</b>
                      <small>
                        {o.code} · {o.description}
                      </small>
                    </td>
                    <td>
                      {o.discount_type === "PERCENTAGE"
                        ? `${o.discount_percent}%${o.max_discount ? ` up to ${money(o.max_discount)}` : ""}`
                        : money(o.discount_percent)}
                      <small>Min. {money(o.minimum_subtotal)}</small>
                    </td>
                    <td>
                      {o.applicability === "ITEMS"
                        ? `${o.eligible_food_ids.length} selected items`
                        : o.applicability === "CATEGORIES"
                          ? `${o.eligible_category_ids.length} categories`
                          : "Entire order"}
                    </td>
                    <td>
                      {o.uses}
                      {o.max_uses ? ` / ${o.max_uses}` : " / ∞"}
                    </td>
                    <td>
                      <span
                        className={`offer-status ${o.status.toLowerCase()}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => edit(o)}>Edit</button>{" "}
                      <button onClick={() => showRedemptions(o)}>
                        History
                      </button>{" "}
                      <button onClick={() => toggle(o)}>
                        {o.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 20 && (
          <div className="offers-pagination">
            <span>
              {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}
            </span>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              disabled={(page + 1) * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
      {form && (
        <div className="offer-modal-backdrop">
          <form className="offer-form" onSubmit={save}>
            <h2>{form.id ? "Edit offer" : "Create offer"}</h2>
            <div className="offer-form-grid">
              <label>
                Title
                <input
                  required
                  maxLength="120"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label>
                Offer code
                <input
                  required
                  pattern="[A-Za-z0-9_-]{3,40}"
                  value={form.code}
                  onChange={(e) => update("code", e.target.value.toUpperCase())}
                />
              </label>
              <label>
                Description
                <input
                  value={form.description || ""}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
              <label>
                Discount type
                <select
                  value={form.discount_type}
                  onChange={(e) => update("discount_type", e.target.value)}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </label>
              <label>
                {form.discount_type === "PERCENTAGE"
                  ? "Discount (%)"
                  : "Discount amount (₹)"}
                <input
                  type="number"
                  min="0.01"
                  max={form.discount_type === "PERCENTAGE" ? "100" : undefined}
                  step="0.01"
                  required
                  value={form.discount_percent}
                  onChange={(e) => update("discount_percent", e.target.value)}
                />
              </label>
              <label>
                Minimum eligible subtotal (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimum_subtotal}
                  onChange={(e) => update("minimum_subtotal", e.target.value)}
                />
              </label>
              {form.discount_type === "PERCENTAGE" && (
                <label>
                  Maximum discount (₹)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.max_discount}
                    onChange={(e) => update("max_discount", e.target.value)}
                  />
                </label>
              )}
              <label>
                Total redemptions
                <input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => update("max_uses", e.target.value)}
                />
              </label>
              <label>
                Per customer limit
                <input
                  type="number"
                  min="1"
                  value={form.per_customer_limit}
                  onChange={(e) => update("per_customer_limit", e.target.value)}
                />
              </label>
              <label>
                Start date
                <CustomDatePicker
                  label="Choose offer start date"
                  value={form.starts_at}
                  minDate={localDateToday()}
                  onChange={(value) => setForm((current) => ({ ...current, starts_at: value, ends_at: current.ends_at && current.ends_at < value ? "" : current.ends_at }))}
                />
              </label>
              <label>
                End date
                <CustomDatePicker
                  label="Choose offer end date"
                  value={form.ends_at}
                  minDate={form.starts_at || localDateToday()}
                  onChange={(value) => update("ends_at", value)}
                />
              </label>
              <label>
                Applicability
                <select
                  value={form.applicability}
                  onChange={(e) => update("applicability", e.target.value)}
                >
                  <option value="RESTAURANT">Entire restaurant order</option>
                  <option value="ITEMS">Specific items</option>
                  <option value="CATEGORIES">Specific categories</option>
                </select>
              </label>
            </div>
            {form.applicability === "ITEMS" && (
              <fieldset>
                <legend>Eligible items</legend>
                {foods.map((food) => (
                  <label className="offer-check" key={food.id}>
                    <input
                      type="checkbox"
                      checked={form.eligible_food_ids?.includes(food.id)}
                      onChange={(e) =>
                        update(
                          "eligible_food_ids",
                          e.target.checked
                            ? [...form.eligible_food_ids, food.id]
                            : form.eligible_food_ids.filter(
                                (id) => id !== food.id,
                              ),
                        )
                      }
                    />
                    {food.name}
                    <small>{food.category_name}</small>
                  </label>
                ))}
              </fieldset>
            )}
            {form.applicability === "CATEGORIES" && (
              <fieldset>
                <legend>Eligible categories</legend>
                {menu.map((c) => (
                  <label className="offer-check" key={c.id}>
                    <input
                      type="checkbox"
                      checked={form.eligible_category_ids?.includes(c.id)}
                      onChange={(e) =>
                        update(
                          "eligible_category_ids",
                          e.target.checked
                            ? [...form.eligible_category_ids, c.id]
                            : form.eligible_category_ids.filter(
                                (id) => id !== c.id,
                              ),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </fieldset>
            )}
            <div className="offer-form-actions">
              <button type="button" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button disabled={busy}>{busy ? "Saving…" : "Save offer"}</button>
            </div>
          </form>
        </div>
      )}
      {redemptionView && (
        <div
          className="offer-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRedemptionView(null);
          }}
        >
          <section className="offer-form">
            <h2>Redemption history · {redemptionView.offer.title}</h2>
            {redemptionView.rows.length ? (
              <div className="offers-table-wrap">
                <table className="offers-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer ref</th>
                      <th>Discount</th>
                      <th>Status</th>
                      <th>Redeemed at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptionView.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.order_id}</td>
                        <td>{r.customer_id || "Guest"}</td>
                        <td>{money(r.discount_amount)}</td>
                        <td>{r.status}</td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No redemptions yet.</p>
            )}
            <div className="offer-form-actions">
              <button type="button" onClick={() => setRedemptionView(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </ManagerLayout>
  );
}
