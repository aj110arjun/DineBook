import useLoadingPhase from "../../hooks/useLoadingPhase.js";
import LoadingState, { RefreshIndicator } from "../../components/ui/LoadingState.jsx";
import { usePageState } from "../../state/usePageState.js";
import { formatLocalDateTime } from "../../lib/localDate.js";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleCheckBig,
  CreditCard,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import { requestJson } from "../../lib/authApi.js";
import "../../assets/css/ManagerPaymentsPage.css";

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (value) => rupeeFormatter.format(Number(value || 0));
const humanize = (value) =>
  String(value || "—")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateTime = (value) => formatLocalDateTime(value, { hour12: false });
const readableId = (value, prefix) =>
  value
    ? `${prefix}-${String(value).replaceAll("-", "").slice(-12).toUpperCase()}`
    : "—";

function StatusBadge({ status }) {
  return (
    <span
      className={`manager-payment-status is-${String(status || "unknown").toLowerCase()}`}
    >
      {humanize(status)}
    </span>
  );
}

function PaymentDetailsModal({ transaction, loading, error, onClose, dialogRef }) {
  const relatedId = transaction?.order_id || transaction?.reservation_id;
  const relatedLabel =
    transaction?.type === "ORDER_PAYMENT" ? "Order ID" : "Reservation ID";

  return (
    <div
      className="manager-payment-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="manager-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
        tabIndex={-1}
      >
        <button
          className="manager-payment-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close payment details"
        >
          <X size={20} aria-hidden="true" />
        </button>
        {loading ? (
          <LoadingState variant="detail" label="Loading transaction details…" />
        ) : error ? (
          <div className="manager-payment-state is-error" role="alert">
            {error}
          </div>
        ) : transaction ? (
          <>
            <div className="manager-payment-modal-mark" aria-hidden="true">
              <CircleCheckBig size={34} />
            </div>
            <header className="manager-payment-modal-heading">
              <span className="manager-payment-eyebrow">PAYMENT RECORD</span>
              <h2 id="manager-payment-modal-title">Payment details</h2>
              <p title={transaction.transaction_id}>
                {readableId(
                  transaction.transaction_id,
                  transaction.type === "ORDER_PAYMENT" ? "TXN-ORD" : "TXN-RES",
                )}
              </p>
            </header>
            <section className="manager-payment-modal-amount" aria-label="Payment amount">
              <span>Amount paid</span>
              <strong>{money(transaction.amount)}</strong>
              <StatusBadge status={transaction.status} />
            </section>
            <section className="manager-payment-modal-card">
              <h3>
                <ReceiptText size={18} aria-hidden="true" /> Payment information
              </h3>
              <dl>
                <dt>{relatedLabel}</dt>
                <dd title={relatedId || undefined}>
                  {readableId(
                    relatedId,
                    transaction.type === "ORDER_PAYMENT" ? "ORD" : "RES",
                  )}
                </dd>
                <dt>Payment type</dt>
                <dd>{humanize(transaction.type)}</dd>
                <dt>Payment method</dt>
                <dd>{humanize(transaction.payment_method)}</dd>
                <dt>Refund status</dt>
                <dd>{humanize(transaction.refund_status)}</dd>
                <dt>Paid on</dt>
                <dd>{dateTime(transaction.created_at)}</dd>
              </dl>
            </section>
            <section className="manager-payment-modal-card manager-payment-modal-reference-card">
              <h3>
                <CreditCard size={18} aria-hidden="true" /> Reference details
              </h3>
              <dl>
                <dt>Payment reference</dt>
                <dd>{transaction.razorpay_payment_id || "—"}</dd>
                <dt>Order reference</dt>
                <dd>{transaction.razorpay_order_id || "—"}</dd>
              </dl>
            </section>
            <footer className="manager-payment-modal-actions">
              <button type="button" className="manager-payment-modal-back" onClick={onClose}>
                <ArrowLeft size={16} aria-hidden="true" /> Back to transactions
              </button>
              <TransactionInvoiceButton
                className="manager-payment-modal-receipt"
                label="Download receipt"
                invoice={{
                  transactionId: transaction.transaction_id,
                  relatedId,
                  relatedLabel,
                  relatedPrefix: transaction.type === "ORDER_PAYMENT" ? "ORD" : "RES",
                  typeLabel: humanize(transaction.type),
                  description: transaction.description,
                  lineItems: transaction.items?.map((item) => ({
                    description: item.food_name,
                    variant_name: item.variant_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    line_total: item.line_total,
                  })),
                  subtotal: transaction.subtotal,
                  discountAmount: transaction.discount_amount,
                  amount: transaction.amount,
                  currency: "INR",
                  status: humanize(transaction.status),
                  paymentMethod: humanize(transaction.payment_method),
                  provider: transaction.payment_method === "RAZORPAY" ? "Razorpay" : undefined,
                  refundStatus: humanize(transaction.refund_status),
                  providerReference: transaction.razorpay_payment_id,
                  providerOrderReference: transaction.razorpay_order_id,
                  createdAt: transaction.created_at,
                  merchantName: transaction.restaurant_name,
                  merchantLocation: transaction.restaurant_location,
                  merchantAddress: transaction.restaurant_address,
                  merchantEmail: transaction.restaurant_email,
                  merchantPhone: transaction.restaurant_phone,
                  customerName: transaction.customer_name,
                  customerEmail: transaction.customer_email,
                }}
              />
            </footer>
          </>
        ) : (
          <div className="manager-payment-state is-error" role="alert">
            This transaction is no longer available.
          </div>
        )}
      </section>
    </div>
  );
}

export default function ManagerPaymentsPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [
    {
      transactions, transaction, total, page, query, status, transactionType,
      paymentMethod, refundStatus, dateFrom, dateTo, sort, listLoading,
      detailLoading, listError, detailError,
    },
    {
      transactions: setTransactions, transaction: setTransaction, total: setTotal,
      page: setPage, query: setQuery, status: setStatus,
      transactionType: setTransactionType, paymentMethod: setPaymentMethod,
      refundStatus: setRefundStatus, dateFrom: setDateFrom, dateTo: setDateTo,
      sort: setSort, listLoading: setListLoading, detailLoading: setDetailLoading,
      listError: setListError, detailError: setDetailError,
    },
  ] = usePageState("ManagerPaymentsPage", () => ({
    transactions: [],
    transaction: null,
    total: 0,
    page: 1,
    query: "",
    status: "ALL",
    transactionType: "ALL",
    paymentMethod: "ALL",
    refundStatus: "ALL",
    dateFrom: "",
    dateTo: "",
    sort: "newest",
    listLoading: true,
    detailLoading: false,
    listError: "",
    detailError: "",
  }));
  const pageSize = 10;

  const { initialLoading, refreshing } = useLoadingPhase(
    listLoading,
    Boolean(transactions.length),
    listError,
  );

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError("");
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort,
    });
    if (query.trim()) params.set("q", query.trim());
    if (status !== "ALL") params.set("payment_status", status);
    if (transactionType !== "ALL")
      params.set("transaction_type", transactionType);
    if (paymentMethod !== "ALL") params.set("payment_method", paymentMethod);
    if (refundStatus !== "ALL") params.set("refund_status", refundStatus);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    requestJson(`/api/manager/payments?${params}`)
      .then((data) => {
        if (active) {
          setTransactions(data.transactions || []);
          setTotal(data.total || 0);
        }
      })
      .catch((reason) => active && setListError(reason.message))
      .finally(() => active && setListLoading(false));
    return () => {
      active = false;
    };
  }, [
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

  useEffect(() => {
    let active = true;
    if (!transactionId) {
      setTransaction(null);
      setDetailError("");
      setDetailLoading(false);
      return () => {
        active = false;
      };
    }
    setTransaction(null);
    setDetailLoading(true);
    setDetailError("");
    requestJson(`/api/manager/payments/${transactionId}`)
      .then((data) => active && setTransaction(data))
      .catch((reason) => active && setDetailError(reason.message))
      .finally(() => active && setDetailLoading(false));
    return () => {
      active = false;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") navigate("/manager/payments");
    };
    document.addEventListener("keydown", closeOnEscape);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [navigate, transactionId]);

  return (
    <ManagerLayout
      title="Payments & Transactions"
      hideHeader
      hideBreadcrumb
    >
      <div
        className="manager-dashboard-content manager-payments-page"
        aria-hidden={Boolean(transactionId)}
      >
        <div className="manager-payments-toolbar">
          <nav
            className="manager-payments-tabs"
            aria-label="Transaction category"
          >
            {[
              { value: "ALL", label: "All transactions" },
              { value: "RESERVATION_FEE", label: "Reservations" },
              { value: "ORDER_PAYMENT", label: "Orders" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={transactionType === tab.value ? "is-active" : ""}
                aria-pressed={transactionType === tab.value}
                onClick={() => {
                  setPage(1);
                  setTransactionType(tab.value);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="manager-payments-total">
            {total.toLocaleString()} transactions
          </span>
        </div>
        <section
          className="manager-payments-filters"
          aria-label="Filter transactions"
        >
          <label className="manager-payments-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search transaction, order, or Razorpay ID"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </label>
          <label>
            <span>Status</span>
            <select
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
          <label>
            <span>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
            />
          </label>
          <details className="manager-payments-advanced">
            <summary>More filters and sorting</summary>
            <div className="manager-payments-advanced-grid">
              <label>
                <span>Payment method</span>
                <select
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
              <label>
                <span>Refund</span>
                <select
                  value={refundStatus}
                  onChange={(event) => {
                    setPage(1);
                    setRefundStatus(event.target.value);
                  }}
                >
                  <option value="ALL">Any refund status</option>
                  <option value="NONE">No refund</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </label>
              <label>
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="amount-low">Amount: low to high</option>
                  <option value="amount-high">Amount: high to low</option>
                </select>
              </label>
            </div>
          </details>
        </section>
        {listError && (
          <div className="manager-payment-state is-error" role="alert">
            {listError}
          </div>
        )}
        {refreshing && !transactionId && <RefreshIndicator active />}
        {initialLoading ? (
          <LoadingState variant="table" columns={9} label="Loading transactions…" />
        ) : transactions.length ? (
          <div className="manager-payments-table-wrap">
            <table className="manager-payments-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Transaction</th>
                  <th>Order ID</th>
                  <th>Reservation ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>
                      <Link
                        className="manager-payment-id"
                        to={`/manager/payments/${item.id}`}
                        title={item.transaction_id}
                      >
                        {readableId(
                          item.transaction_id,
                          item.type === "ORDER_PAYMENT" ? "TXN-ORD" : "TXN-RES",
                        )}
                      </Link>
                    </td>
                    <td>
                      <span className="manager-payment-type">
                        {humanize(item.type)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="manager-payment-related-id"
                        title={item.order_id || undefined}
                      >
                        {readableId(item.order_id, "ORD")}
                      </span>
                    </td>
                    <td>
                      <span
                        className="manager-payment-related-id"
                        title={item.reservation_id || undefined}
                      >
                        {readableId(item.reservation_id, "RES")}
                      </span>
                    </td>
                    <td className="manager-payment-amount">
                      {money(item.amount)}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{humanize(item.payment_method)}</td>
                    <td>{dateTime(item.created_at)}</td>
                    <td>
                      <Link
                        className="manager-payment-view-link"
                        to={`/manager/payments/${item.id}`}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="manager-payment-state manager-payment-empty">
            <CreditCard size={24} />
            <strong>No transactions found</strong>
            <span>Try adjusting your search or filters.</span>
          </div>
        )}
        {!listLoading && total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            label="transactions"
          />
        )}
      </div>
      {transactionId && (
        <PaymentDetailsModal
          transaction={transaction}
          loading={detailLoading}
          error={detailError}
          dialogRef={dialogRef}
          onClose={() => navigate("/manager/payments")}
        />
      )}
    </ManagerLayout>
  );
}
