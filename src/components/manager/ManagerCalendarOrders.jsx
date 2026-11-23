import { CalendarDays, ChevronRight, Clock3, CreditCard, Mail, MapPin, Table2, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { formatLocalDateTime, formatLocalTime } from "../../lib/localDate.js";
import ManagerOrderItems from "./ManagerOrderItems.jsx";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const initials = (name) => name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "G";
const readable = (value) => value?.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not available";
const orderStatus = (status) => ({
  PLACED: "Awaiting acceptance", ACCEPTED: "Sent to kitchen", PREPARING: "Being prepared",
  READY: "Ready to serve", SERVED: "Served", COMPLETED: "Completed", CANCELLED: "Cancelled", REJECTED: "Rejected",
})[status] || readable(status);
const orderTone = (status) => ({
  PLACED: "pending", ACCEPTED: "confirmed", PREPARING: "confirmed", READY: "completed",
  SERVED: "completed", COMPLETED: "completed", CANCELLED: "cancelled", REJECTED: "cancelled",
})[status] || "pending";
const orderType = (order) => order.service_type === "TAKEAWAY" ? "Takeaway order" : order.order_source === "SPOT" ? "Spot order" : "Walk-in order";
const itemCount = (order) => (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const tableLabel = (order) => (order.tables || []).map((table) => `Table ${table.table_number}`).join(", ") || (order.service_type === "TAKEAWAY" ? "Takeaway" : "Not assigned");

export function buildCalendarActivities(reservations, orders) {
  const activities = [
    ...reservations.map((item) => ({ type: "reservation", item, selectionId: item.id, active: ["CONFIRMED", "PENDING_PAYMENT", "SEATED"].includes(item.status) })),
    ...orders.map((item) => ({ type: "order", item, selectionId: `order:${item.id}`, active: !["COMPLETED", "CANCELLED", "REJECTED"].includes(item.status) })),
  ];
  return [...activities.filter((entry) => entry.active), ...activities.filter((entry) => !entry.active)];
}

export function ManagerCalendarOrderCard({ order, selected, onSelect }) {
  const count = itemCount(order);
  return (
    <article className={`reservation-guest-card${selected ? " expanded" : ""}`}>
      <button
        type="button"
        className="reservation-card-select"
        aria-label={`View order for ${order.customer_name || "Guest"}`}
        aria-pressed={selected}
        aria-controls="reservation-detail-panel"
        onClick={onSelect}
      >
        <div className="reservation-card-tags">
          <span>#{order.id.slice(0, 8).toUpperCase()}</span>
          <span>{orderType(order)}</span>
        </div>
        <div className="reservation-guest-top">
          <span className="reservation-avatar">{initials(order.customer_name)}</span>
          <span className="reservation-guest-name">
            <strong>{order.customer_name || "Guest"}</strong>
            <span>{order.customer_email || "Restaurant guest"}</span>
          </span>
          <ChevronRight size={17} className="reservation-card-chevron" />
        </div>
        <div className="reservation-guest-meta">
          <span><Clock3 size={14} />{formatLocalTime(order.created_at)}</span>
          <span><Utensils size={14} />{count} {count === 1 ? "item" : "items"}</span>
          <span><Table2 size={14} />{tableLabel(order)}</span>
        </div>
        <div className="reservation-order-card-summary">
          <span>{(order.items || []).map((food) => `${food.quantity} × ${food.food_name || "Menu item"}`).join(", ") || "No item details"}</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className={`reservation-card-status ${orderTone(order.status)}`}>
          <span>{orderStatus(order.status)}</span>
          <small>{selected ? "Viewing details" : "View order"}</small>
        </div>
      </button>
    </article>
  );
}

export function ManagerCalendarOrderDetails({ order, dateLabel }) {
  const count = itemCount(order);
  const floors = [...new Set((order.tables || []).map((table) => table.floor_name).filter(Boolean))].join(", ");
  const paymentMethod = ({ WALLET: "DineBook wallet", PAY_AT_DESK: "Pay at desk", RAZORPAY: "Online payment" })[order.payment_method] || readable(order.payment_method);
  return (
    <>
      <header className="reservation-detail-heading">
        <span className="reservation-eyebrow">ORDER DETAILS</span>
        <span>#{order.id.slice(0, 8).toUpperCase()}</span>
      </header>
      <div className="reservation-detail-hero">
        <div className="reservation-detail-tags">
          <span className={`reservation-status ${orderTone(order.status)}`}>{orderStatus(order.status)}</span>
          <span>{orderType(order)}</span>
        </div>
        <div className="reservation-detail-guest">
          <div className="reservation-avatar">{initials(order.customer_name)}</div>
          <div><h3>{order.customer_name || "Guest"}</h3><p><Mail size={14} />{order.customer_email || "Restaurant guest"}</p></div>
        </div>
        <div className="reservation-detail-hero-footer">
          <CalendarDays size={15} /><span>{dateLabel}</span>
          <span className="reservation-detail-duration">{formatLocalTime(order.created_at)}</span>
        </div>
      </div>
      <section className="reservation-information">
        <h3>Order information</h3>
        <div className="reservation-information-grid">
          <div><CalendarDays size={20} /><span><small>Order date</small><strong>{dateLabel}</strong></span></div>
          <div><Clock3 size={20} /><span><small>Placed at</small><strong>{formatLocalTime(order.created_at)}</strong></span></div>
          <div><Utensils size={20} /><span><small>Items ordered</small><strong>{count} {count === 1 ? "item" : "items"}</strong></span></div>
          <div><Table2 size={20} /><span><small>Table</small><strong>{tableLabel(order)}</strong></span></div>
          {floors && <div><MapPin size={20} /><span><small>Floor / zone</small><strong>{floors}</strong></span></div>}
          <div><Utensils size={20} /><span><small>Order type</small><strong>{orderType(order)}</strong></span></div>
        </div>
      </section>
      <section className="reservation-information reservation-payment-information">
        <h3>Payment information</h3>
        <div className="reservation-information-grid">
          <div><CreditCard size={20} /><span><small>Order total</small><strong>{money(order.total)}</strong></span></div>
          <div><CreditCard size={20} /><span><small>Payment status</small><strong>{readable(order.payment_status)}</strong></span></div>
          <div><CreditCard size={20} /><span><small>Payment method</small><strong>{paymentMethod}</strong></span></div>
        </div>
      </section>
      <section className="reservation-information reservation-order-items">
        <ManagerOrderItems items={order.items || []} title="Order items" />
        <dl className="reservation-order-totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {Number(order.discount_amount) > 0 && <div><dt>Discount{order.offer_code ? ` · ${order.offer_code}` : ""}</dt><dd>−{money(order.discount_amount)}</dd></div>}
          <div><dt>Tax{Number(order.tax_percent) > 0 ? ` (${order.tax_percent}%)` : ""}</dt><dd>{money(order.tax_amount)}</dd></div>
          <div className="reservation-order-total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
      </section>
      {order.customer_note && <section className="reservation-information reservation-special-request"><h3>Customer note</h3><p>{order.customer_note}</p></section>}
      {order.status_reason && <section className="reservation-information reservation-special-request"><h3>Status note</h3><p>{order.status_reason}</p></section>}
      <section className="reservation-information">
        <h3>Order progress</h3>
        <ol className="reservation-order-progress-list">
          {[["Placed", order.created_at], ["Sent to kitchen", order.accepted_at], ["Preparation started", order.preparation_started_at], ["Ready to serve", order.ready_at], ["Completed", order.completed_at]]
            .filter(([, time]) => time)
            .map(([label, time]) => <li key={label}><span>{label}</span><time>{formatLocalDateTime(time)}</time></li>)}
        </ol>
      </section>
      <div className="reservation-information reservation-visit-actions">
        <Link className="reservation-order-manage" to={`/manager/orders/${order.id}?returnTo=${encodeURIComponent("/manager/reservations")}`}>Manage order<ChevronRight size={16} /></Link>
      </div>
    </>
  );
}
