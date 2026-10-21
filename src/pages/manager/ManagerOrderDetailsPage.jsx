import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Package, UserRound, Users, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerOrderDetailsPage.css";

const statusLabel = (status) => (status || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function ManagerOrderDetailsPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const [actionReason, setActionReason] = useState("");
  const backToOrders = location.state?.returnTo || new URLSearchParams(location.search).get("returnTo") || "/manager/reservations";

  const loadOrder = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const result = await requestJson(`/api/manager/orders/${encodeURIComponent(orderId)}`, { signal });
      if (!result?.id) throw new Error("This order could not be found.");
      if (!signal?.aborted) setOrder(result);
    } catch (reason) {
      if (!signal?.aborted) setError(reason.message || "Unable to load this order.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();
    loadOrder(controller.signal);
    return () => controller.abort();
  }, [loadOrder]);

  const actions = useMemo(() => {
    if (!order) return [];
    if (order.status === "PLACED") return ["ACCEPTED", "REJECTED"];
    if (order.status === "READY") return ["COMPLETED"];
    return [];
  }, [order]);
  const canCancel = ["PLACED", "ACCEPTED", "PREPARING"].includes(order?.status);
  const canMarkPaid = order?.payment_method === "PAY_AT_DESK" && order?.payment_status === "PENDING" && !["CANCELLED", "REJECTED"].includes(order?.status);

  async function updateStatus(status, reason = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson(`/api/manager/orders/${encodeURIComponent(order.id)}/status`, { method: "PATCH", body: JSON.stringify({ status, reason: reason.trim() || null }) });
      setOrder(result);
      setConfirmAction("");
      setNotice(`Order marked ${statusLabel(result.status).toLowerCase()}.`);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function cancelOrder() {
    return updateStatus("CANCELLED");
  }

  async function markPaid() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson(`/api/manager/orders/${encodeURIComponent(order.id)}/mark-paid`, { method: "POST" });
      setOrder(result);
      setNotice("Payment recorded.");
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  const reservation = order?.reservation;
  const itemCount = order?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
  const orderType = order?.is_preorder ? "Reservation preorder" : reservation ? "Reservation order" : "Walk-in order";

  return <ManagerLayout title="Order Details">
    <main className="manager-dashboard-content manager-order-details-page">
      <nav className="manager-order-details-breadcrumb" aria-label="Breadcrumb"><Link to="/manager/dashboard">Manager</Link><span>/</span><Link to={backToOrders}>Orders</Link><span>/</span><strong>Order Details</strong></nav>
      <header className="manager-order-details-heading"><div><span className="manager-orders-breadcrumb">ORDER MANAGEMENT</span><h1>Order Details</h1><p>Review the order, payment, and visit information.</p></div><Link className="manager-order-back" to={backToOrders}><ArrowLeft size={16} />Back to Orders</Link></header>
      {notice && <p className="manager-order-details-notice" role="status">{notice}</p>}
      {loading ? <section className="manager-order-details-state" aria-live="polite"><span className="manager-order-details-spinner" /><p>Loading order details…</p></section>
        : error && !order ? <section className="manager-order-details-state" role="alert"><strong>Order unavailable</strong><p>{error}</p><div><button type="button" onClick={() => loadOrder()}>Try again</button><Link to={backToOrders}>Back to Orders</Link></div></section>
          : order && <>
            {error && <p className="manager-order-details-error" role="alert">{error}</p>}
            <section className="manager-order-details-overview">
              <div className="manager-order-details-title-row"><div><span>ORDER REFERENCE</span><h2>#{order.id.slice(0, 8).toUpperCase()}</h2></div><span className={`manager-order-status status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span></div>
              <div className="manager-order-details-facts">
                <div><UserRound /><span>Customer</span><strong>{order.customer_name || "Guest"}</strong>{order.customer_email && <small>{order.customer_email}</small>}</div>
                <div><Clock3 /><span>Created</span><strong>{dateTime(order.created_at)}</strong></div>
                <div><Package /><span>Order type</span><strong>{orderType}</strong></div>
                {reservation && <>
                  <div><CalendarDays /><span>Visit</span><strong>{reservation.reservation_date ? new Date(`${reservation.reservation_date}T12:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}{reservation.start_time ? ` · ${reservation.start_time}` : ""}</strong></div>
                  <div><Users /><span>Party size</span><strong>{reservation.number_of_guests || "—"} guests</strong></div>
                  {order.reservation_id && <div><Package /><span>Reservation reference</span><Link className="manager-order-reservation-link" to={`/manager/reservations?reservationId=${encodeURIComponent(order.reservation_id)}`}>#{order.reservation_id.slice(0, 8).toUpperCase()}</Link></div>}
                  {!!reservation.tables?.length && <div><MapPin /><span>Table</span><strong>{reservation.tables.map((table) => `${table.floor_name ? `${table.floor_name} · ` : ""}${table.table_number}`).join(", ")}</strong></div>}
                </>}
              </div>
            </section>

            <div className="manager-order-details-columns">
              <section className="manager-order-details-items">
                <header><div><h2>Order items</h2><p>{itemCount} {itemCount === 1 ? "item" : "items"}</p></div></header>
                {order.items?.length ? <div className="manager-order-details-item-list">{order.items.map((item, index) => <article key={`${item.variant_id || item.food_name}-${index}`}>
                  {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <span className="manager-order-details-item-placeholder"><Package size={18} /></span>}
                  <div className="manager-order-details-item-name"><strong>{item.food_name || "Menu item"}</strong>{item.variant_name && <span>{item.variant_name}</span>}<small>Qty {item.quantity} × {money(item.unit_price)}</small></div>
                  <strong className="manager-order-details-line-total">{money(item.line_total)}</strong>
                </article>)}</div> : <p className="manager-order-details-empty">No item details are available.</p>}
              </section>

              <aside className="manager-order-details-side">
                <section className="manager-order-details-payment"><header><Wallet size={18} /><div><h2>Payment & totals</h2><p>{order.payment_status === "PAID" ? "Payment received" : order.payment_status === "REFUNDED" ? "Refunded" : "Payment pending"}</p></div></header>
                  <dl><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>{Number(order.discount_amount) > 0 && <div><dt>{order.offer_code ? `Discount · ${order.offer_code}` : "Discount"}</dt><dd>−{money(order.discount_amount)}</dd></div>}<div className="manager-order-details-total"><dt>Total</dt><dd>{money(order.total)}</dd></div><div><dt>Method</dt><dd>{order.payment_method === "WALLET" ? "DineBook wallet" : "Pay at desk"}</dd></div><div><dt>Status</dt><dd><span className={`manager-order-payment-pill ${order.payment_status?.toLowerCase()}`}>{statusLabel(order.payment_status)}</span></dd></div></dl>
                </section>
                {order.customer_note && <section className="manager-order-details-note"><span>Customer note</span><p>{order.customer_note}</p></section>}
                <section className="manager-order-details-note manager-order-lifecycle"><span>Order progress</span><ol><li className={order.status !== "CANCELLED" && order.status !== "REJECTED" ? "complete" : ""}>Placed <time>{dateTime(order.created_at)}</time></li><li className={order.accepted_at ? "complete" : ""}>Accepted <time>{dateTime(order.accepted_at)}</time></li><li className={order.preparation_started_at ? "complete" : ""}>In progress <time>{dateTime(order.preparation_started_at)}</time></li><li className={order.ready_at ? "complete" : ""}>Ready <time>{dateTime(order.ready_at)}</time></li><li className={order.completed_at ? "complete" : ""}>Completed <time>{dateTime(order.completed_at)}</time></li></ol>{order.status_reason && <p>Status note: {order.status_reason}</p>}</section>
              </aside>
            </div>
            <section className="manager-order-details-actions"><div><h2>Order actions</h2><p>Available actions follow the current order status.</p></div><div>{canMarkPaid && <button type="button" disabled={busy} onClick={markPaid}>{busy ? "Recording…" : "Mark payment received"}</button>}{actions.map((status) => <button key={status} type="button" className={status === "REJECTED" ? "danger" : ""} disabled={busy} onClick={() => status === "REJECTED" ? (setActionReason(""), setConfirmAction("reject")) : updateStatus(status)}>{statusLabel(status)}</button>)}{canCancel && <button type="button" className="danger" disabled={busy} onClick={() => { setActionReason(""); setConfirmAction("cancel"); }}>Cancel order</button>}</div></section>
            {confirmAction && <ConfirmActionDialog action={confirmAction} resourceType="food order" resourceName={`#${order.id.slice(0, 8).toUpperCase()}`} title={confirmAction === "reject" ? "Reject this order?" : "Cancel this order?"} description={confirmAction === "reject" ? "The order will be rejected and cannot continue through preparation." : "The order will be cancelled. Any eligible refund will be credited to the customer’s DineBook wallet."} confirmLabel={confirmAction === "reject" ? "Reject order" : "Cancel order"} requireReason reasonLabel={confirmAction === "reject" ? "Rejection reason" : "Cancellation reason"} reason={actionReason} onReasonChange={setActionReason} busy={busy} onCancel={() => { if (!busy) setConfirmAction(""); }} onConfirm={(reason) => updateStatus(confirmAction === "reject" ? "REJECTED" : "CANCELLED", reason)} />}
          </>}
    </main>
  </ManagerLayout>;
}
