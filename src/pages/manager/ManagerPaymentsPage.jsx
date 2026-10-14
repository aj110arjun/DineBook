import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard, FileText, Search } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerPaymentsPage.css";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const humanize = (value) => String(value || "—").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateTime = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const readableId = (value, prefix) => value ? `${prefix}-${String(value).replaceAll("-", "").slice(-12).toUpperCase()}` : "—";

function StatusBadge({ status }) {
  return <span className={`manager-payment-status is-${String(status || "unknown").toLowerCase()}`}>{humanize(status)}</span>;
}

export default function ManagerPaymentsPage() {
  const { transactionId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [transaction, setTransaction] = useState(null);
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
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (transactionId) {
      setTransaction(null);
      requestJson(`/api/manager/payments/${transactionId}`).then((data) => active && setTransaction(data))
        .catch((reason) => active && setError(reason.message)).finally(() => active && setLoading(false));
      return () => { active = false; };
    }
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort });
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("payment_status", status);
    if (transactionType !== "ALL") params.set("transaction_type", transactionType);
    if (paymentMethod !== "ALL") params.set("payment_method", paymentMethod);
    if (refundStatus !== "ALL") params.set("refund_status", refundStatus);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    requestJson(`/api/manager/payments?${params}`).then((data) => {
      if (active) { setTransactions(data.transactions || []); setTotal(data.total || 0); }
    }).catch((reason) => active && setError(reason.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [transactionId, page, query, status, transactionType, paymentMethod, refundStatus, dateFrom, dateTo, sort]);

  if (transactionId) {
    const relatedId = transaction?.order_id || transaction?.reservation_id;
    const relatedLabel = transaction?.type === "ORDER_PAYMENT" ? "Order ID" : "Reservation ID";
    return <ManagerLayout title="Transaction details">
      <div className="manager-dashboard-content manager-payments-page">
        <Link className="manager-payments-back" to="/manager/payments"><ArrowLeft size={16} /> Payments & transactions</Link>
        {loading ? <div className="manager-payment-state" role="status">Loading transaction details…</div>
          : error ? <div className="manager-payment-state is-error" role="alert">{error}</div>
            : transaction && <>
              <header className="manager-payment-detail-heading">
                <div><span className="manager-payment-eyebrow">TRANSACTION RECORD</span><h2>{transaction.type === "ORDER_PAYMENT" ? "Order payment" : "Reservation fee"}</h2><p>Transaction ID <span title={transaction.transaction_id}>{readableId(transaction.transaction_id, transaction.type === "ORDER_PAYMENT" ? "TXN-ORD" : "TXN-RES")}</span></p></div>
                <div className="manager-payment-detail-actions"><StatusBadge status={transaction.status} /><TransactionInvoiceButton invoice={{ transactionId: transaction.transaction_id, relatedId, relatedLabel, relatedPrefix: transaction.type === "ORDER_PAYMENT" ? "ORD" : "RES", typeLabel: humanize(transaction.type), description: transaction.description, lineItems: transaction.items?.map((item) => ({ description: item.food_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total })), subtotal: transaction.subtotal, discountAmount: transaction.discount_amount, amount: transaction.amount, currency: transaction.currency, status: humanize(transaction.status), paymentMethod: humanize(transaction.payment_method), provider: transaction.payment_method === "RAZORPAY" ? "Razorpay" : undefined, refundStatus: humanize(transaction.refund_status), providerReference: transaction.razorpay_payment_id, providerOrderReference: transaction.razorpay_order_id, createdAt: transaction.created_at, merchantName: transaction.restaurant_name, merchantLocation: transaction.restaurant_location, merchantAddress: transaction.restaurant_address, merchantEmail: transaction.restaurant_email, merchantPhone: transaction.restaurant_phone, customerName: transaction.customer_name, customerEmail: transaction.customer_email }} /></div>
              </header>
              <section className="manager-payment-amount-card" aria-label="Payment amount">
                <span>Amount</span><strong>{money(transaction.amount)} <small>{transaction.currency || "INR"}</small></strong>
                <span className="manager-payment-amount-type">{humanize(transaction.type)}</span>
              </section>
              <div className="manager-payment-detail-grid">
                <section className="manager-payment-detail-card">
                  <h3><FileText size={17} /> Transaction information</h3>
                  <dl><dt>Transaction ID</dt><dd title={transaction.transaction_id}>{readableId(transaction.transaction_id, transaction.type === "ORDER_PAYMENT" ? "TXN-ORD" : "TXN-RES")}</dd><dt>{relatedLabel}</dt><dd title={relatedId || undefined}>{readableId(relatedId, transaction.type === "ORDER_PAYMENT" ? "ORD" : "RES")}</dd><dt>Payment type</dt><dd>{humanize(transaction.type)}</dd><dt>Payment method</dt><dd>{humanize(transaction.payment_method)}</dd><dt>Payment status</dt><dd><StatusBadge status={transaction.status} /></dd><dt>Refund status</dt><dd>{humanize(transaction.refund_status)}</dd></dl>
                </section>
                <section className="manager-payment-detail-card">
                  <h3><CreditCard size={17} /> Provider references</h3>
                  <dl><dt>Razorpay order ID</dt><dd>{transaction.razorpay_order_id || "—"}</dd><dt>Razorpay payment ID</dt><dd>{transaction.razorpay_payment_id || "—"}</dd><dt>Currency</dt><dd>{transaction.currency || "INR"}</dd></dl>
                </section>
                <section className="manager-payment-detail-card manager-payment-timestamps">
                  <h3><CalendarDays size={17} /> Record timestamps</h3>
                  <dl><dt>Created</dt><dd>{dateTime(transaction.created_at)}</dd><dt>Last updated</dt><dd>{dateTime(transaction.updated_at)}</dd></dl>
                </section>
              </div>
            </>}
      </div>
    </ManagerLayout>;
  }

  return <ManagerLayout title="Payments & Transactions">
    <div className="manager-dashboard-content manager-payments-page">
      <header className="manager-payments-heading"><div><span className="manager-payment-eyebrow">FINANCE</span><h2>Payments & Transactions</h2><p>Review reservation and order payments for your restaurant.</p></div><span className="manager-payments-total">{total.toLocaleString()} transactions</span></header>
      <nav className="manager-payments-tabs" aria-label="Transaction category">
        {[{ value: "ALL", label: "All transactions" }, { value: "RESERVATION_FEE", label: "Reservations" }, { value: "ORDER_PAYMENT", label: "Orders" }].map((tab) => <button key={tab.value} type="button" className={transactionType === tab.value ? "is-active" : ""} aria-pressed={transactionType === tab.value} onClick={() => { setPage(1); setTransactionType(tab.value); }}>{tab.label}</button>)}
      </nav>
      <section className="manager-payments-filters" aria-label="Filter transactions">
        <label className="manager-payments-search"><Search size={17} /><input type="search" placeholder="Search transaction, order, or Razorpay ID" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} /></label>
        <label><span>Status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select></label>
        <label><span>From</span><input type="date" value={dateFrom} onChange={(event) => { setPage(1); setDateFrom(event.target.value); }} /></label>
        <label><span>To</span><input type="date" value={dateTo} onChange={(event) => { setPage(1); setDateTo(event.target.value); }} /></label>
        <details className="manager-payments-advanced"><summary>More filters and sorting</summary><div className="manager-payments-advanced-grid">
          <label><span>Payment method</span><select value={paymentMethod} onChange={(event) => { setPage(1); setPaymentMethod(event.target.value); }}><option value="ALL">All methods</option><option value="RAZORPAY">Razorpay</option><option value="WALLET">Wallet</option><option value="PAY_AT_DESK">Pay at desk</option></select></label>
          <label><span>Refund</span><select value={refundStatus} onChange={(event) => { setPage(1); setRefundStatus(event.target.value); }}><option value="ALL">Any refund status</option><option value="NONE">No refund</option><option value="REFUNDED">Refunded</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount-low">Amount: low to high</option><option value="amount-high">Amount: high to low</option></select></label>
        </div></details>
      </section>
      {error && <div className="manager-payment-state is-error" role="alert">{error}</div>}
      {loading ? <div className="manager-payment-state" role="status">Loading transactions…</div>
        : transactions.length ? <div className="manager-payments-table-wrap"><table className="manager-payments-table"><thead><tr><th>Transaction ID</th><th>Transaction</th><th>Order ID</th><th>Reservation ID</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{transactions.map((item) => <tr key={`${item.type}-${item.id}`}>
          <td><Link className="manager-payment-id" to={`/manager/payments/${item.id}`} title={item.transaction_id}>{readableId(item.transaction_id, item.type === "ORDER_PAYMENT" ? "TXN-ORD" : "TXN-RES")}</Link></td>
          <td><span className="manager-payment-type">{humanize(item.type)}</span></td>
          <td><span className="manager-payment-related-id" title={item.order_id || undefined}>{readableId(item.order_id, "ORD")}</span></td>
          <td><span className="manager-payment-related-id" title={item.reservation_id || undefined}>{readableId(item.reservation_id, "RES")}</span></td>
          <td className="manager-payment-amount">{money(item.amount)}</td><td><StatusBadge status={item.status} /></td>
          <td>{humanize(item.payment_method)}</td><td>{dateTime(item.created_at)}</td><td><Link className="manager-payment-view-link" to={`/manager/payments/${item.id}`}>Details</Link></td>
        </tr>)}</tbody></table></div>
        : <div className="manager-payment-state manager-payment-empty"><CreditCard size={24} /><strong>No transactions found</strong><span>Try adjusting your search or filters.</span></div>}
      {!loading && total > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="transactions" />}
    </div>
  </ManagerLayout>;
}
