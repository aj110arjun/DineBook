import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, CreditCard, FileText } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import { requestJson } from "../../lib/authApi.js";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import "./CustomerProfilePage.css";

const humanize = (value) => String(value || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const readableId = (value, prefix) => value ? `${prefix}-${String(value).replaceAll("-", "").slice(0, 8).toUpperCase()}` : "—";
const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomerTransactionDetailsPage() {
  const { transactionType, transactionId } = useParams();
  const normalizedType = transactionType.replaceAll("-", "_").toUpperCase();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const readableType = transactionType.toLowerCase().replaceAll("_", "-");
    if (transactionType !== readableType) {
      navigate(`/customer/profile/transactions/${readableType}/${transactionId}`, { replace: true });
    }
  }, [navigate, transactionType, transactionId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const profile = await requestJson("/api/customer/me");
        if (alive) setUser(profile);
      } catch {
        if (alive) navigate("/customer/login", { replace: true });
        return;
      }
      try {
        const details = await requestJson(`/api/customer/transactions/${encodeURIComponent(transactionType)}/${encodeURIComponent(transactionId)}`);
        if (alive) setTransaction(details);
      } catch (reason) {
        if (alive) setError(reason.message || "Could not load transaction details.");
      } finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [navigate, transactionType, transactionId]);

  const relatedId = normalizedType === "FOOD_ORDER" ? transaction?.order_id : transaction?.related_id;
  const relatedPrefix = normalizedType === "FOOD_ORDER" ? "ORD" : "RES";
  const invoice = transaction && {
    category: transaction.category || (normalizedType === "WALLET" ? "wallet" : undefined),
    transactionId: transaction.id,
    relatedId,
    relatedPrefix,
    relatedLabel: relatedPrefix === "ORD" ? "Order ID" : "Reservation ID",
    transactionPrefix: normalizedType === "WALLET" ? "WLT" : "TXN",
    typeLabel: humanize(normalizedType),
    description: transaction.description,
    lineItems: transaction.items?.map((item) => ({ description: item.food_name || item.name || "Food item", variant_name: item.variant_name, quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total }))
      || [{ description: transaction.description, quantity: 1, unitPrice: transaction.amount, amount: transaction.amount }],
    subtotal: transaction.subtotal ?? transaction.amount,
    discountAmount: transaction.discount_amount,
    amount: transaction.amount,
    currency: transaction.currency || "INR",
    status: humanize(transaction.status),
    paymentMethod: humanize(transaction.payment_method),
    provider: transaction.payment_method === "RAZORPAY" ? "Razorpay" : undefined,
    providerReference: transaction.provider_reference,
    providerOrderReference: transaction.provider_order_reference,
    refundStatus: humanize(transaction.refund_status),
    createdAt: transaction.created_at,
    merchantName: transaction.restaurant_name || "DineBook",
    merchantLocation: transaction.restaurant_location,
    merchantAddress: transaction.restaurant_address,
    merchantEmail: transaction.restaurant_email,
    merchantPhone: transaction.restaurant_phone,
    customerName: transaction.customer_name || user?.name,
    customerEmail: transaction.customer_email || user?.email,
  };
  const relatedLabel = relatedPrefix === "ORD" ? "Order ID" : "Reservation ID";

  return <ProfileFrame user={user} active="Payment Transactions"><section className="profile-card customer-transaction-detail-card">
    <Link className="reservation-back" to="/customer/profile/transactions"><ArrowLeft size={16} />All payment transactions</Link>
    {busy ? <p className="profile-empty" role="status">Loading transaction details…</p> : error ? <p className="profile-empty" role="alert">{error}</p> : transaction && <>
      <header className="customer-transaction-detail-heading"><div><span className="customer-transaction-detail-eyebrow">TRANSACTION DETAILS</span><h1>{humanize(normalizedType)}</h1><p>{transaction.description}</p></div><div className="customer-transaction-detail-actions"><span className={`customer-transaction-status status-${String(transaction.status || "").toLowerCase()}`}>{humanize(transaction.status)}</span><TransactionInvoiceButton invoice={invoice} /></div></header>
      <section className="customer-transaction-amount"><span>Transaction amount</span><strong>{money(transaction.amount)} <small>{transaction.currency || "INR"}</small></strong></section>
      <div className="customer-transaction-detail-grid">
        <section className="customer-transaction-detail-panel"><h2><FileText size={17} />Transaction information</h2><dl><dt>Transaction ID</dt><dd title={transaction.id}>{readableId(transaction.id, normalizedType === "WALLET" ? "WLT" : "TXN")}</dd><dt>{relatedLabel}</dt><dd title={relatedId || undefined}>{readableId(relatedId, relatedPrefix)}</dd><dt>Type</dt><dd>{humanize(normalizedType)}</dd><dt>Payment method</dt><dd>{humanize(transaction.payment_method)}</dd><dt>Status</dt><dd>{humanize(transaction.status)}</dd><dt>Refund status</dt><dd>{humanize(transaction.refund_status)}</dd></dl></section>
        <section className="customer-transaction-detail-panel"><h2><CreditCard size={17} />Payment references</h2><dl><dt>Payment reference</dt><dd>{transaction.provider_reference || "—"}</dd><dt>Provider order reference</dt><dd>{transaction.provider_order_reference || "—"}</dd><dt>Merchant</dt><dd>{transaction.restaurant_name || "DineBook"}</dd><dt>Payment method</dt><dd>{humanize(transaction.payment_method)}</dd></dl></section>
        <section className="customer-transaction-detail-panel"><h2><CalendarDays size={17} />Record date</h2><dl><dt>Created</dt><dd>{dateLabel(transaction.created_at)}</dd></dl></section>
      </div>
      {transaction.items?.length > 0 && <section className="customer-transaction-items"><h2>Order items</h2>{transaction.items.map((item, index) => <div key={`${item.food_id || item.food_name || index}-${index}`}><span>{item.food_name || item.name || "Food item"}{item.variant_name ? ` · ${item.variant_name}` : ""} × {item.quantity || 1}</span><strong>{money(item.line_total ?? Number(item.unit_price || 0) * Number(item.quantity || 1))}</strong></div>)}</section>}
    </>}
  </section></ProfileFrame>;
}
