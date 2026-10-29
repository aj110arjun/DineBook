import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./AdminTransactionsPage.css";

const humanize = (value) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value || 0),
  );
const dateLabel = (value) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";
function Fields({ title, fields }) {
  return (
    <section className="transaction-detail-card">
      <h3>{title}</h3>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AdminTransactionDetailsPage() {
  const { restaurantId, transactionId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setItem(null);
    requestJson(
      `/api/admin/restaurants/${encodeURIComponent(restaurantId)}/payments/${encodeURIComponent(transactionId)}`,
    )
      .then((data) => active && setItem(data))
      .catch(
        (reason) =>
          active && setError(reason.message || "Unable to load transaction."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [restaurantId, transactionId, retry]);
  const order = item?.type === "ORDER_PAYMENT";
  const invoice = item && {
    transactionId: item.transaction_id,
    relatedId: item.order_id || item.reservation_id,
    relatedLabel: order ? "Order ID" : "Reservation ID",
    relatedPrefix: order ? "ORD" : "RES",
    typeLabel: order ? "Food order payment" : "Reservation fee",
    description: item.description,
    amount: item.amount,
    subtotal: item.subtotal ?? item.amount,
    discountAmount: item.discount_amount,
    currency: item.currency,
    status: item.status,
    paymentMethod: item.payment_method,
    providerReference: item.razorpay_payment_id,
    providerOrderReference: item.razorpay_order_id,
    refundStatus: item.refund_status,
    createdAt: item.created_at,
    merchantName: item.restaurant_name,
    merchantLocation: item.restaurant_location,
    merchantAddress: item.restaurant_address,
    merchantEmail: item.restaurant_email,
    merchantPhone: item.restaurant_phone,
    customerName: item.customer_name,
    customerEmail: item.customer_email,
    lineItems: item.items?.map((row) => ({
      description: row.food_name || row.name || "Food item",
      variant_name: row.variant_name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      line_total: row.line_total,
    })),
  };
  return (
    <AdminLayout title="Transaction details">
      <div className="admin-transactions-panel admin-transactions-page">
        <Link className="transaction-back" to="/admin/transactions">
          <ArrowLeft size={16} /> Back to transactions
        </Link>
        {loading ? (
          <div className="transactions-empty" role="status">
            Loading transaction details…
          </div>
        ) : error ? (
          <div className="transactions-empty">
            <p role="alert">{error}</p>
            <button
              type="button"
              className="transactions-reset"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          item && (
            <>
              <header className="transactions-heading transaction-detail-heading">
                <div>
                  <p>{order ? "Food order payment" : "Reservation fee"}</p>
                  <h2>{money(item.amount)}</h2>
                  <span
                    className={`transaction-status transaction-status-${item.status?.toLowerCase()}`}
                  >
                    {humanize(item.status)}
                  </span>
                </div>
                <TransactionInvoiceButton invoice={invoice} />
              </header>
              <div className="transaction-details-grid">
                <Fields
                  title="Payment information"
                  fields={[
                    ["Transaction ID", item.transaction_id],
                    ["Payment method", humanize(item.payment_method)],
                    ["Refund status", humanize(item.refund_status)],
                    ["Created", dateLabel(item.created_at)],
                    ["Updated", dateLabel(item.updated_at)],
                    ["Provider order reference", item.razorpay_order_id],
                    ["Provider payment reference", item.razorpay_payment_id],
                  ]}
                />
                <Fields
                  title="Restaurant & customer"
                  fields={[
                    [
                      "Restaurant",
                      <Link to={`/admin/restaurants/${restaurantId}`}>
                        {item.restaurant_name}
                      </Link>,
                    ],
                    ["Location", item.restaurant_location],
                    ["Address", item.restaurant_address],
                    ["Restaurant email", item.restaurant_email],
                    ["Restaurant phone", item.restaurant_phone],
                    ["Customer", item.customer_name],
                    ["Customer email", item.customer_email],
                  ]}
                />
                <Fields
                  title={
                    order ? "Order information" : "Reservation information"
                  }
                  fields={[
                    ["Order ID", item.order_id],
                    ["Reservation ID", item.reservation_id],
                    ...(!order
                      ? [
                          ["Reservation date", item.reservation_date],
                          [
                            "Reservation status",
                            humanize(item.reservation_status),
                          ],
                        ]
                      : []),
                    ["Description", item.description],
                  ]}
                />
                <Fields
                  title="Amount breakdown"
                  fields={[
                    ["Subtotal", money(item.subtotal ?? item.amount)],
                    ["Discount", money(item.discount_amount)],
                    ...(order ? [["Tax", money(item.tax_amount)]] : []),
                    ["Total", money(item.amount)],
                    ["Currency", item.currency],
                  ]}
                />
              </div>
              {item.items?.length > 0 && (
                <section className="transaction-detail-card">
                  <h3>Order items</h3>
                  <div className="transactions-table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Quantity</th>
                          <th>Unit price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.items.map((row, index) => (
                          <tr key={index}>
                            <td>
                              {row.food_name || row.name || "Food item"}
                              {row.variant_name && (
                                <small> · {row.variant_name}</small>
                              )}
                            </td>
                            <td>{row.quantity}</td>
                            <td>{money(row.unit_price)}</td>
                            <td>{money(row.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
