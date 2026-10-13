import { useEffect, useState } from "react";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";

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
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 10;

  async function openTransaction(item) {
    setSelected({ ...item, detailLoading: true });
    try {
      const detail = await requestJson(`/api/admin/restaurants/${restaurantId}/payments/${item.id}`);
      setSelected({ ...item, ...detail, detailLoading: false });
    } catch (reason) {
      setSelected({ ...item, detailLoading: false, detailError: reason.message });
    }
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("payment_status", status);
    if (transactionType !== "ALL") params.set("transaction_type", transactionType);
    if (paymentMethod !== "ALL") params.set("payment_method", paymentMethod);
    if (refundStatus !== "ALL") params.set("refund_status", refundStatus);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort", sort);
    setLoading(true);
    requestJson(`/api/admin/restaurants/${restaurantId}/payments?${params}`)
      .then((data) => { if (active) { setTransactions(data.transactions || []); setTotal(data.total || 0); } })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [restaurantId, page, query, status, transactionType, paymentMethod, refundStatus, dateFrom, dateTo, sort]);

  return <section className="admin-restaurant-detail-card admin-restaurant-wide-card">
    <h3>Payments & Transactions</h3>
    <div className="admin-page-actions"><input type="search" placeholder="Search transaction or Razorpay reference" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} /><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select><select value={transactionType} onChange={(event) => { setPage(1); setTransactionType(event.target.value); }}><option value="ALL">All transaction types</option><option value="RESERVATION_FEE">Reservation fee</option><option value="ORDER_PAYMENT">Order payment</option></select><select value={paymentMethod} onChange={(event) => { setPage(1); setPaymentMethod(event.target.value); }}><option value="ALL">All methods</option><option value="RAZORPAY">Razorpay</option><option value="WALLET">Wallet</option><option value="PAY_AT_DESK">Pay at desk</option></select><select value={refundStatus} onChange={(event) => { setPage(1); setRefundStatus(event.target.value); }}><option value="ALL">All refund statuses</option><option value="NONE">No refund</option><option value="REFUNDED">Refunded</option></select><input aria-label="From date" type="date" value={dateFrom} onChange={(event) => { setPage(1); setDateFrom(event.target.value); }} /><input aria-label="To date" type="date" value={dateTo} onChange={(event) => { setPage(1); setDateTo(event.target.value); }} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amount-low">Amount low to high</option><option value="amount-high">Amount high to low</option></select></div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p>Loading transactions…</p> : transactions.length ? <div className="admin-table-card"><table className="admin-table"><thead><tr><th>Transaction</th><th>Order / reservation</th><th>Type</th><th>Amount</th><th>Status</th><th>Method</th><th>Provider reference</th><th>Date</th><th></th></tr></thead><tbody>{transactions.map((item) => <tr key={`${item.type}-${item.id}`}><td>{item.transaction_id.slice(0, 12)}</td><td>{(item.order_id || item.reservation_id || "—").slice(0, 12)}</td><td>{item.type}</td><td>₹{Number(item.amount).toFixed(2)} {item.currency}</td><td>{item.status}</td><td>{item.payment_method}</td><td>{item.razorpay_payment_id || item.razorpay_order_id || "—"}</td><td>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td><td><button type="button" onClick={() => openTransaction(item)}>Details</button></td></tr>)}</tbody></table></div> : <p>No transactions match these filters.</p>}
    <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="transactions" />
    {selected && <div className="admin-request-empty" role="dialog" aria-label="Transaction details"><button type="button" onClick={() => setSelected(null)}>Close</button><h4>{selected.type === "ORDER_PAYMENT" ? "Order payment details" : "Reservation payment details"}</h4><p>Transaction {selected.transaction_id}</p><p>Order / reservation: {selected.order_id || selected.reservation_id || "—"}</p><p>Amount: ₹{Number(selected.amount).toFixed(2)} {selected.currency}</p><p>Payment status: {selected.status}; refund status: {selected.refund_status}</p><p>Provider order: {selected.razorpay_order_id || "—"}</p><p>Provider payment: {selected.razorpay_payment_id || "—"}</p><p>Created: {selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}</p><p>Updated: {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—"}</p>{selected.detailLoading ? <p>Preparing invoice details…</p> : selected.detailError ? <p role="alert">Invoice unavailable: {selected.detailError}</p> : <TransactionInvoiceButton invoice={{ transactionId: selected.transaction_id, relatedId: selected.order_id || selected.reservation_id, relatedLabel: selected.type === "ORDER_PAYMENT" ? "Order ID" : "Reservation ID", relatedPrefix: selected.type === "ORDER_PAYMENT" ? "ORD" : "RES", typeLabel: selected.type === "ORDER_PAYMENT" ? "Restaurant order payment" : "Reservation fee", description: selected.description, lineItems: selected.items?.map((item) => ({ description: item.food_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total })), subtotal: selected.subtotal, discountAmount: selected.discount_amount, amount: selected.amount, currency: selected.currency, status: selected.status?.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), paymentMethod: selected.payment_method, provider: selected.payment_method === "RAZORPAY" ? "Razorpay" : undefined, providerReference: selected.razorpay_payment_id, providerOrderReference: selected.razorpay_order_id, refundStatus: selected.refund_status, createdAt: selected.created_at, merchantName: selected.restaurant_name, merchantLocation: selected.restaurant_location, merchantAddress: selected.restaurant_address, merchantEmail: selected.restaurant_email, merchantPhone: selected.restaurant_phone, customerName: selected.customer_name, customerEmail: selected.customer_email }} />}</div>}
  </section>;
}
