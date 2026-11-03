import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReceiptText, RotateCcw } from "lucide-react";
import "./AdminTransactionsPage.css";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminRestaurantPaymentsPanel({ restaurantId }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [transactionType, setTransactionType] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [refundStatus, setRefundStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const global = !restaurantId;
  const PAGE_SIZE_DEFAULT = 10;

  useEffect(() => {
    if (!global) return;
    let active = true;
    requestJson("/api/admin/transactions/restaurants")
      .then((data) => active && setRestaurants(data))
      .catch((reason) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, [global]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE_DEFAULT),
    });
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("payment_status", status);
    if (transactionType !== "ALL")
      params.set("transaction_type", transactionType);
    if (paymentMethod !== "ALL") params.set("payment_method", paymentMethod);
    if (refundStatus !== "ALL") params.set("refund_status", refundStatus);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort", sort);
    if (global && restaurantFilter)
      params.set("restaurant_id", restaurantFilter);
    setLoading(true);
    setError("");
    requestJson(
      `${global ? "/api/admin/transactions" : `/api/admin/restaurants/${restaurantId}/payments`}?${params}`,
    )
      .then((data) => {
        if (active) {
          setTransactions(data.transactions || []);
          setTotal(data.total || 0);
        }
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [
    restaurantId,
    global,
    restaurantFilter,
    PAGE_SIZE_DEFAULT,
    page,
    query,
    status,
    transactionType,
    paymentMethod,
    refundStatus,
    dateFrom,
    dateTo,
    sort,
  ]);

  const hasFilters =
    query ||
    status !== "ALL" ||
    transactionType !== "ALL" ||
    paymentMethod !== "ALL" ||
    refundStatus !== "ALL" ||
    dateFrom ||
    dateTo ||
    restaurantFilter;
  function resetFilters() {
    setQuery("");
    setStatus("ALL");
    setTransactionType("ALL");
    setPaymentMethod("ALL");
    setRefundStatus("ALL");
    setDateFrom("");
    setDateTo("");
    setRestaurantFilter("");
    setPage(1);
  }

  return (
    <section
      className={`admin-transactions-panel${global ? " admin-transactions-page" : ""}`}
    >
      <header className="transactions-heading">
        <div>
          <h2>Payments & transactions</h2>
          <p>
            {global
              ? "Track reservation fees and food order payments across your restaurants."
              : "Track this restaurant’s reservation fees and food order payments."}
          </p>
        </div>
        <button
          className="transactions-reset"
          type="button"
          disabled={!hasFilters}
          onClick={resetFilters}
        >
          <RotateCcw size={15} /> Reset filters
        </button>
      </header>
      <div className="transactions-filters">
        {global && (
          <label className="transaction-field">
            <span>Restaurant</span>
            <select
              aria-label="Restaurant"
              value={restaurantFilter}
              onChange={(event) => {
                setPage(1);
                setRestaurantFilter(event.target.value);
              }}
            >
              <option value="">All restaurants</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="transaction-field transaction-field-search">
          <span>Search</span>
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search restaurant, transaction or reference"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
        </label>
        <label className="transaction-field">
          <span>Payment status</span>
          <select
            aria-label="Payment status"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </label>
        <label className="transaction-field">
          <span>Transaction type</span>
          <select
            aria-label="Transaction type"
            value={transactionType}
            onChange={(event) => {
              setPage(1);
              setTransactionType(event.target.value);
            }}
          >
            <option value="ALL">All transaction types</option>
            <option value="RESERVATION_FEE">Reservation fee</option>
            <option value="ORDER_PAYMENT">Order payment</option>
          </select>
        </label>
        <label className="transaction-field">
          <span>Payment method</span>
          <select
            aria-label="Payment method"
            value={paymentMethod}
            onChange={(event) => {
              setPage(1);
              setPaymentMethod(event.target.value);
            }}
          >
            <option value="ALL">All methods</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="WALLET">Wallet</option>
            <option value="PAY_AT_DESK">Pay at desk</option>
          </select>
        </label>
        <label className="transaction-field">
          <span>Refund status</span>
          <select
            aria-label="Refund status"
            value={refundStatus}
            onChange={(event) => {
              setPage(1);
              setRefundStatus(event.target.value);
            }}
          >
            <option value="ALL">All refund statuses</option>
            <option value="NONE">No refund</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </label>
        <label className="transaction-field">
          <span>From date</span>
          <input
            aria-label="From date"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
        </label>
        <label className="transaction-field">
          <span>To date</span>
          <input
            aria-label="To date"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </label>
        <label className="transaction-field">
          <span>Sort by</span>
          <select
            aria-label="Sort transactions"
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value);
            }}
          >
            {global && <option value="restaurant-asc">Restaurant A–Z</option>}
            {global && <option value="restaurant-desc">Restaurant Z–A</option>}
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="amount-low">Amount low to high</option>
            <option value="amount-high">Amount high to low</option>
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <div className="transactions-empty" role="status">
          <ReceiptText size={28} />
          <h3>Loading transactions…</h3>
          <p>Fetching the latest payment records.</p>
        </div>
      ) : error ? null : transactions.length ? (
        <div className="admin-table-card transactions-table">
          <table className="admin-table">
            <thead>
              <tr>
                {global && <th>Restaurant</th>}
                <th>Transaction</th>
                <th>Order / reservation</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th>Provider reference</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  {global && <td>{item.restaurant_name}</td>}
                  <td>{item.transaction_id.slice(0, 12)}</td>
                  <td>
                    {(item.order_id || item.reservation_id || "—").slice(0, 12)}
                  </td>
                  <td>
                    {item.type === "ORDER_PAYMENT"
                      ? "Food order"
                      : "Reservation fee"}
                  </td>
                  <td>
                    ₹{Number(item.amount).toFixed(2)} {item.currency}
                  </td>
                  <td>
                    <span
                      className={`transaction-status transaction-status-${item.status?.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.payment_method?.replaceAll("_", " ")}</td>
                  <td>
                    {item.razorpay_payment_id || item.razorpay_order_id || "—"}
                  </td>
                  <td>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <Link
                      className="transaction-details-link"
                      to={`/admin/transactions/${item.restaurant_id || restaurantId}/${item.id}`}
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="transactions-empty">
          <span className="transactions-empty-icon">
            <ReceiptText size={28} />
          </span>
          <h3>
            {hasFilters ? "No matching transactions" : "No transactions yet"}
          </h3>
          <p>
            {hasFilters
              ? "Try another restaurant or adjust your filters to see more results."
              : "Reservation fees and food order payments will appear here."}
          </p>
          {hasFilters && (
            <button
              type="button"
              className="transactions-reset"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE_DEFAULT}
        total={total}
        onPageChange={setPage}
        label="transactions"
      />
    </section>
  );
}
