import { formatLocalDateTime } from "../../lib/localDate.js";
import { useId, useState } from "react";
import { Check, ChevronDown, Copy, Search, TicketPercent } from "lucide-react";
import Pagination from "../Pagination.jsx";
import "../../assets/css/RestaurantOffers.css";

const PAGE_SIZE = 4;
const statusLabels = {
  ACTIVE: "Available now",
  SCHEDULED: "Coming soon",
  EXPIRED: "Expired",
  EXHAUSTED: "Fully redeemed",
  INACTIVE: "Unavailable",
};
const statusOrder = ["ACTIVE", "SCHEDULED", "EXPIRED", "EXHAUSTED", "INACTIVE"];
const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export default function RestaurantOffers({ offers }) {
  const headingId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const search = query.trim().toLowerCase();
  const filteredOffers = offers
    .filter((offer) => {
      const searchable = [
        offer.title, offer.code, offer.description, ...(offer.applicable_names || []),
      ].join(" ").toLowerCase();
      return (status === "ALL" || offer.status === status) && searchable.includes(search);
    })
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredOffers.length / PAGE_SIZE)));
  const visibleOffers = filteredOffers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const availableCount = offers.filter((offer) => offer.status === "ACTIVE").length;

  async function copyCode(offer) {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopyFeedback({ id: offer.id, success: true });
    } catch {
      setCopyFeedback({ id: offer.id, success: false });
    }
  }

  if (!offers.length) return null;

  return (
    <section className="restaurant-offers" aria-labelledby={headingId}>
      <header className="restaurant-offers-heading">
        <div>
          <span className="restaurant-about-eyebrow">A LITTLE EXTRA WITH YOUR MEAL</span>
          <h2 id={headingId}><TicketPercent size={22} aria-hidden="true" /> Restaurant offers</h2>
          <p>Find a deal for your next order. Check the details before using a code.</p>
        </div>
        <span className="restaurant-offers-count">{availableCount} available now</span>
      </header>

      <div className="restaurant-offers-toolbar">
        <label className="restaurant-offers-search">
          <Search size={18} aria-hidden="true" />
          <span className="ux-sr-only">Search restaurant offers</span>
          <input
            type="search"
            placeholder="Search by offer, code or dish"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          />
        </label>
        <label className="restaurant-offers-filter">
          <span>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="ALL">All offers ({offers.length})</option>
            {statusOrder.filter((value) => offers.some((offer) => offer.status === value)).map((value) => (
              <option key={value} value={value}>{statusLabels[value]}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="restaurant-offers-results" role="status">
        {filteredOffers.length} {filteredOffers.length === 1 ? "offer" : "offers"}{search || status !== "ALL" ? " matching your filters" : " to explore"}
      </p>

      {visibleOffers.length ? (
        <div className="restaurant-offers-grid">
          {visibleOffers.map((offer) => (
            <article className="restaurant-offer-card" key={offer.id}>
              <div className="restaurant-offer-topline">
                <span className="restaurant-offer-saving">
                  {offer.discount_type === "PERCENTAGE"
                    ? `${Number(offer.discount_percent)}% off`
                    : `${currency(offer.discount_percent)} off`}
                </span>
                <span className={`restaurant-offer-status ${offer.status.toLowerCase()}`}>
                  {statusLabels[offer.status] || offer.status}
                </span>
              </div>
              <h3>{offer.title}</h3>
              <p className="restaurant-offer-summary">
                {Number(offer.minimum_subtotal) > 0 ? `On orders from ${currency(offer.minimum_subtotal)}` : "No minimum order"}
                {offer.max_discount != null && ` · Save up to ${currency(offer.max_discount)}`}
              </p>
              <div className="restaurant-offer-code-row">
                <div><span>USE CODE</span><code>{offer.code}</code></div>
                <button type="button" onClick={() => copyCode(offer)} aria-label={`Copy offer code ${offer.code}`}>
                  {copyFeedback?.id === offer.id && copyFeedback.success
                    ? <><Check size={15} aria-hidden="true" /> Copied</>
                    : <><Copy size={15} aria-hidden="true" /> Copy</>}
                </button>
              </div>
              <p className="restaurant-offer-copy-feedback" role="status">
                {copyFeedback?.id === offer.id
                  ? copyFeedback.success ? "Offer code copied." : "Could not copy. Select the code above to copy it manually."
                  : ""}
              </p>
              <details className="restaurant-offer-details">
                <summary>Offer details <ChevronDown size={16} aria-hidden="true" /></summary>
                {offer.description && <p>{offer.description}</p>}
                <dl>
                  <div><dt>Applies to</dt><dd>{offer.applicability === "RESTAURANT" ? "Entire order" : `${offer.applicability === "ITEMS" ? "Items" : "Categories"}: ${(offer.applicable_names || []).join(", ") || "See the restaurant menu"}`}</dd></div>
                  <div><dt>Minimum order</dt><dd>{currency(offer.minimum_subtotal)}</dd></div>
                  {offer.max_discount != null && <div><dt>Maximum saving</dt><dd>{currency(offer.max_discount)}</dd></div>}
                  <div><dt>Usage limit</dt><dd>{offer.per_customer_limit ? `${offer.per_customer_limit} ${Number(offer.per_customer_limit) === 1 ? "use" : "uses"} per customer` : "No per-customer limit"}</dd></div>
                  {offer.starts_at && <div><dt>Starts</dt><dd><time dateTime={offer.starts_at}>{formatLocalDateTime(offer.starts_at)}</time></dd></div>}
                  {offer.ends_at && <div><dt>Ends</dt><dd><time dateTime={offer.ends_at}>{formatLocalDateTime(offer.ends_at)}</time></dd></div>}
                </dl>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="restaurant-offers-empty">
          <TicketPercent size={28} aria-hidden="true" />
          <h3>No offers match your search</h3>
          <p>Try another code or dish, or clear your filters to see all offers.</p>
          <button type="button" onClick={() => { setQuery(""); setStatus("ALL"); setPage(1); }}>Clear filters</button>
        </div>
      )}

      {filteredOffers.length > PAGE_SIZE && (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filteredOffers.length}
          onPageChange={setPage}
          label="offers"
          className="restaurant-offers-pagination"
        />
      )}
    </section>
  );
}
