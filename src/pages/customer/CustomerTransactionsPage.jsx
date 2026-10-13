import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import "./CustomerProfilePage.css";

const typeLabel = (value) => ({ RESERVATION_FEE: "Reservation fee", FOOD_ORDER: "Food order", WALLET: "Wallet activity" }[value] || value);
const statusLabel = (value) => String(value || "Unknown").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function CustomerTransactionsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    requestJson("/api/customer/me")
      .then((data) => alive && setUser(data))
      .catch(() => alive && navigate("/customer/login", { replace: true }));
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => { setPage(1); }, [query, type, status, dateFrom, dateTo, pageSize]);
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (query.trim()) params.set("q", query.trim());
      if (type !== "ALL") params.set("transaction_type", type);
      if (status !== "ALL") params.set("status", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      try {
        const result = await requestJson(`/api/customer/transactions?${params}`);
        if (alive) { setTransactions(result.transactions || []); setTotal(result.total || 0); }
      } catch (reason) {
        if (alive) { setTransactions([]); setTotal(0); setError(reason.message || "Could not load payment transactions."); }
      } finally { if (alive) setBusy(false); }
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [user, query, type, status, dateFrom, dateTo, page, pageSize]);

  return <ProfileFrame user={user} active="Payment Transactions"><section className="profile-card reservation-list-card customer-transactions-card">
    <div className="profile-card-title"><h1>Payment Transactions</h1><span>{total} RECORD{total === 1 ? "" : "S"}</span></div>
    <p className="reservation-intro">A single view of your reservation payments, food orders, and wallet activity.</p>
    <div className="reservation-toolbar customer-transaction-toolbar">
      <label>Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Restaurant, description, or reference" /></label>
      <label>Transaction type<select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All transactions</option><option value="RESERVATION_FEE">Reservation fees</option><option value="FOOD_ORDER">Food orders</option><option value="WALLET">Wallet activity</option></select></label>
      <label>Payment status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option><option value="CREDITED">Credited</option><option value="DEBITED">Debited</option></select></label>
      <label>From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
      <label>To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
      <label>Rows per page<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
      <button type="button" onClick={() => { setQuery(""); setType("ALL"); setStatus("ALL"); setDateFrom(""); setDateTo(""); }}>Clear filters</button>
    </div>
    {busy ? <p className="profile-empty">Loading transactions…</p> : error ? <p className="profile-empty" role="alert">{error}</p> : transactions.length ? <div className="customer-transactions-list">{transactions.map((item) => <article className="customer-transaction-row" key={`${item.transaction_type}-${item.id}`}>
      <div className="customer-transaction-icon"><CreditCard size={19} /></div>
      <div className="customer-transaction-main"><strong>{item.restaurant_name ? `${typeLabel(item.transaction_type)} · ${item.restaurant_name}` : typeLabel(item.transaction_type)}</strong><span>{item.description}</span><small><CalendarDays size={13} />{dateLabel(item.created_at)} · {String(item.payment_method || "—").replaceAll("_", " ")}</small>{item.provider_reference && <small>Reference: {item.provider_reference}</small>}</div>
      <div className="customer-transaction-side"><strong>₹{Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><span className={`customer-transaction-status status-${String(item.status || "").toLowerCase()}`}>{statusLabel(item.status)}</span><Link to={`/customer/profile/transactions/${encodeURIComponent(item.transaction_type.toLowerCase().replaceAll("_", "-"))}/${encodeURIComponent(item.id)}`}>View details</Link></div>
    </article>)}</div> : <div className="reservation-empty compact"><Search size={26} /><h2>{total ? "No matching transactions" : "No payment transactions yet"}</h2><p>Your payments and wallet activity will appear here.</p></div>}
    {!busy && !error && total > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="transactions" showPageNumbers />}
  </section></ProfileFrame>;
}
