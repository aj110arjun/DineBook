import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, CreditCard, MapPin, Utensils, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import "./CustomerProfilePage.css";

const dateText = (value) => value ? new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
const timeText = (value) => { if (!value) return "—"; const [h, m] = value.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const title = (value) => (value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CustomerReservationDetailsPage() {
  const { reservationId } = useParams(); const navigate = useNavigate(); const [user, setUser] = useState(null); const [reservation, setReservation] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [reloadKey, setReloadKey] = useState(0); const [confirmCancellation, setConfirmCancellation] = useState(false);
  async function load(signal, onSettled) {
    setLoading(true); setError("");
    try {
      const data = await requestJson(`/api/customer/reservations/${reservationId}`, { signal });
      if (!data || typeof data !== "object" || !data.id) throw new Error("The reservation details could not be loaded. Please try again.");
      if (!signal?.aborted) setReservation(data);
    } catch (reason) {
      if (!signal?.aborted) setError(reason.message || "The reservation details could not be loaded. Please try again.");
    } finally {
      onSettled?.();
      if (!signal?.aborted) setLoading(false);
    }
  }
  useRealtimeEvents({
    enabled: Boolean(user) && !(import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active"),
    onEvent: (event) => {
      if (event?.event_type === "booking.updated" && event.resource_id !== reservationId) return;
      if (event?.event_type === "booking.updated" || event?.event_type === "order.status_changed" || event?.event_type === "payment.status_changed") load();
    },
    onReconnect: () => load(),
  });
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setError("Loading reservation details took too long. Check your connection and try again.");
        setLoading(false);
        controller.abort();
      }
    }, 20000);
    const demo = import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active";
    (demo ? Promise.resolve(demoCustomer) : requestJson("/api/customer/me", { signal: controller.signal }))
      .then((value) => { if (alive) setUser(value); })
      .catch(() => { if (alive && !controller.signal.aborted) navigate("/customer/login", { replace: true }); });
    load(controller.signal, () => window.clearTimeout(timeout));
    return () => { alive = false; window.clearTimeout(timeout); controller.abort(); };
  }, [reservationId, navigate, reloadKey]);
  async function cancel() { setBusy(true); setNotice(""); try { const result = await requestJson(`/api/customer/reservations/${reservationId}/cancel`, { method: "POST" }); setNotice(`Reservation cancelled. ₹${Number(result.wallet_refund || 0).toFixed(2)} refunded to your wallet.`); setConfirmCancellation(false); await load(); } catch (reason) { setNotice(reason.message); } finally { setBusy(false); } }
  return <ProfileFrame user={user} variant="reservation-details-page">
    <header className="reservation-page-header">
      <div>
        <span className="reservation-page-eyebrow">YOUR ACCOUNT</span>
        <h1>Reservation Details</h1>
        <p>Review your booking, payment, and food orders.</p>
      </div>
      <Link className="reservation-back" to="/customer/profile/reservations"><ArrowLeft size={16} /> Back to bookings</Link>
    </header>
    {error ? <section className="profile-card reservation-detail-card"><div className="profile-empty"><p>{error}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button></div></section>
      : loading || !reservation ? <section className="profile-card reservation-detail-card" aria-live="polite"><p className="profile-empty">Loading reservation…</p></section>
        : <>
          <section className="profile-card reservation-detail-card">
            <div className="reservation-detail-heading">
              <div className="reservation-restaurant-copy">
                <span className="reservation-kicker">BOOKING OVERVIEW</span>
                <h2>{reservation.restaurant_name || "Restaurant reservation"}</h2>
                {reservation.restaurant_location && <p><MapPin size={15} />{reservation.restaurant_location}</p>}
                <span className="reservation-id-chip">Reservation #{reservation.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <span className={`reservation-status ${reservation.status?.toLowerCase()}`}>{title(reservation.status)}</span>
            </div>
            {notice && <p className="reservation-notice" role="status">{notice}</p>}
            <section className="reservation-detail-section" aria-labelledby="visit-details-heading">
              <h3 id="visit-details-heading">Visit details</h3>
              <div className="reservation-detail-grid">
                <div><CalendarDays aria-hidden="true" /><span>Date</span><strong>{dateText(reservation.reservation_date)}</strong></div>
                <div><Clock3 aria-hidden="true" /><span>Time</span><strong>{timeText(reservation.start_time)} – {timeText(reservation.end_time)}</strong></div>
                <div><Users aria-hidden="true" /><span>Party size</span><strong>{reservation.number_of_guests} guests</strong></div>
                <div><MapPin aria-hidden="true" /><span>Table</span><strong>{reservation.tables?.length ? reservation.tables.map((table) => `${table.floor_name} · Table ${table.table_number}`).join(", ") : "Not assigned"}</strong></div>
              </div>
            </section>
            <section className="reservation-lifecycle" aria-label="Reservation lifecycle">
              <h3>Reservation progress</h3>
              <ol>{["CONFIRMED", "SEATED", "COMPLETED"].map((stage) => {
                const currentIndex = ["CONFIRMED", "SEATED", "COMPLETED"].indexOf(reservation.status);
                const stageIndex = ["CONFIRMED", "SEATED", "COMPLETED"].indexOf(stage);
                const stamp = stage === "SEATED" ? reservation.checked_in_at : stage === "COMPLETED" ? reservation.completed_at : reservation.created_at;
                return <li key={stage} className={currentIndex >= stageIndex ? "complete" : ""}><span>{title(stage)}</span>{stamp && currentIndex >= stageIndex && <time dateTime={stamp}>{new Date(stamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>}</li>;
              })}</ol>
              {!["CONFIRMED", "SEATED", "COMPLETED"].includes(reservation.status) && <p className="reservation-lifecycle-terminal">{title(reservation.status)}{reservation.status_reason ? ` · ${reservation.status_reason}` : ""}</p>}
            </section>
            <section className="reservation-payment-section" aria-label="Reservation payment">
              <div className="reservation-payment-label"><CreditCard size={18} /><div><span className="reservation-section-kicker">PAYMENT</span><h3>Reservation fee</h3></div></div>
              <strong className="reservation-payment-amount">₹{Number(reservation.fee_amount || 0).toFixed(2)}</strong>
              <span className={`reservation-payment-status ${reservation.payment_status?.toLowerCase()}`}>{title(reservation.payment_status)}</span>
              <TransactionInvoiceButton invoice={{ transactionId: reservation.id, relatedId: reservation.id, relatedLabel: "Reservation ID", relatedPrefix: "RES", typeLabel: "Reservation fee", description: `Reservation fee · ${dateText(reservation.reservation_date)} · ${timeText(reservation.start_time)}`, lineItems: [{ description: `Reservation fee · ${dateText(reservation.reservation_date)} · ${timeText(reservation.start_time)}`, quantity: 1, unitPrice: reservation.fee_amount, amount: reservation.fee_amount }], subtotal: reservation.fee_amount, amount: reservation.fee_amount, currency: "INR", status: title(reservation.payment_status), paymentMethod: title(reservation.payment_method), provider: reservation.payment_method === "RAZORPAY" ? "Razorpay" : undefined, providerReference: reservation.razorpay_payment_id, providerOrderReference: reservation.razorpay_order_id, createdAt: reservation.created_at, merchantName: reservation.restaurant_name, merchantLocation: reservation.restaurant_location, merchantAddress: reservation.restaurant_address, merchantEmail: reservation.restaurant_email, merchantPhone: reservation.restaurant_phone, customerName: reservation.customer_name, customerEmail: reservation.customer_email }} />
            </section>
          </section>
          {reservation.fulfillment_type === "PREORDER" && <section className="profile-card reservation-preorder-section">
            <div className="reservation-preorder-heading"><div className="reservation-section-title"><Utensils size={18} /><div><span className="reservation-section-kicker">PREORDER</span><h2>Food ordered</h2></div></div><span>{reservation.preorder_payment_status === "PAID" ? "Paid from wallet" : "Due at desk"}</span></div>
            <div className="reservation-preorder-lines">{(reservation.preorder_items || []).map((item) => <div className="reservation-preorder-line" key={item.variant_id}>{item.image_url && <img className="order-food-thumb" src={item.image_url} alt="" loading="lazy" />}<span><b>{item.quantity} ×</b> {item.food_name} <small>· {item.variant_name}</small></span><strong>₹{Number(item.line_total).toFixed(2)}</strong></div>)}</div>
            <div className="reservation-preorder-total"><span>Food subtotal</span><strong>₹{Number(reservation.preorder_total || 0).toFixed(2)}</strong></div>
          </section>}
          {reservation.food_orders?.length > 0 && <section className="profile-card reservation-food-orders">
            <div className="reservation-food-orders-heading"><div className="reservation-section-title"><Utensils size={18} /><div><span className="reservation-section-kicker">ORDER UPDATES</span><h2>Food orders</h2></div></div></div>
            <div className="reservation-food-order-list">{reservation.food_orders.map((order) => <article className="reservation-food-order" key={order.id}>
              <div className="reservation-food-order-top"><Link to={`/customer/profile/orders?search=${encodeURIComponent(order.id)}`}>Order #{order.id.slice(0, 8).toUpperCase()}</Link><span className={`reservation-status ${order.status?.toLowerCase()}`}>{title(order.status)}</span></div>
              <div className="reservation-preorder-lines">{(order.items || []).map((item, index) => <div className="reservation-preorder-line" key={`${order.id}-${index}`}>{item.image_url && <img className="order-food-thumb" src={item.image_url} alt="" loading="lazy" />}<span><b>{item.quantity} ×</b> {item.food_name} <small>· {item.variant_name}</small></span><strong>₹{Number(item.line_total).toFixed(2)}</strong></div>)}</div>
              <div className="reservation-preorder-total"><span>Order total</span><strong>₹{Number(order.total || 0).toFixed(2)}</strong></div>
              <TransactionInvoiceButton invoice={{ transactionId: order.id, relatedId: order.id, relatedLabel: "Order ID", relatedPrefix: "ORD", typeLabel: "Food order", lineItems: order.items?.map((item) => ({ description: item.food_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total })), subtotal: order.subtotal, discountAmount: order.discount_amount, amount: order.total, currency: "INR", status: title(order.payment_status), paymentMethod: title(order.payment_method), provider: order.payment_method === "RAZORPAY" ? "Razorpay" : undefined, providerReference: order.razorpay_payment_id, providerOrderReference: order.razorpay_order_id, createdAt: order.created_at, merchantName: order.restaurant_name || reservation.restaurant_name, merchantLocation: order.restaurant_location || reservation.restaurant_location, merchantAddress: order.restaurant_address || reservation.restaurant_address, merchantEmail: order.restaurant_email || reservation.restaurant_email, merchantPhone: order.restaurant_phone || reservation.restaurant_phone, customerName: order.customer_name || reservation.customer_name, customerEmail: order.customer_email || reservation.customer_email }} />
              {order.completed_at && <small>Completed {new Date(order.completed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>}
              {order.status_reason && <p className="reservation-notice">Status note: {order.status_reason}</p>}
            </article>)}</div>
          </section>}
          {reservation.special_request && <section className="profile-card reservation-special-request"><span className="reservation-section-kicker">SPECIAL REQUEST</span><p>{reservation.special_request}</p></section>}
          <div className="reservation-detail-actions"><Link to={`/customer/restaurants/${reservation.restaurant_id}`}>View restaurant</Link>{["PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status) && <button disabled={busy} onClick={() => setConfirmCancellation(true)}>{busy ? "Cancelling…" : "Cancel reservation"}</button>}</div>
        </>}
    {confirmCancellation && reservation && <ConfirmActionDialog action="cancel" resourceType="reservation" resourceName={reservation.restaurant_name} title="Cancel this reservation?" description="If you cancel more than 24 hours after booking, the reservation fee is not refundable. Any paid preorder amount and other eligible refunds are credited to your DineBook wallet." busy={busy} onCancel={() => { if (!busy) setConfirmCancellation(false); }} onConfirm={cancel} />}
  </ProfileFrame>;
}
