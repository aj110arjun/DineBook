import { Fragment, useMemo, useRef, useState } from "react";
import { CalendarDays, ChefHat, ChevronRight, Clock3, MapPin, Package, RefreshCw, Search, Table2, Users, Utensils, AlertTriangle } from "lucide-react";
import ReservationDateStrip from "../manager/ReservationDateStrip.jsx";
import LoadingState, { RefreshIndicator } from "../ui/LoadingState.jsx";
import Pagination from "../Pagination.jsx";
import { formatLocalDate, formatLocalDateTime, formatLocalTime, formatWallTime } from "../../lib/localDate.js";
import "../../assets/css/ChefOrdersPage.css";

export const CHEF_ORDER_ACTIONS = {
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["SERVED"],
};
const ACTION_LABELS = { PREPARING: "Start preparing", READY: "Mark ready", SERVED: "Mark as served" };
const STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED", "REJECTED"];
const activeOrder = (order) => ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(order.status);
const statusLabel = (value) => value?.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const tone = (status) => ({ PLACED: "pending", ACCEPTED: "confirmed", PREPARING: "preparing", READY: "completed", SERVED: "completed", COMPLETED: "completed", CANCELLED: "cancelled", REJECTED: "cancelled" })[status] || "pending";
const tablesFor = (order) => order.tables?.length ? order.tables : order.reservation?.tables || [];
const itemCount = (order) => (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const sourceLabel = (order) => order.is_preorder ? "Preorder" : order.reservation ? "Reservation order" : order.order_source === "SPOT" ? "Spot order" : "Walk-in order";
const serviceLabel = (order) => order.service_type === "TAKEAWAY" ? "Takeaway" : "Dine-in";
const guestInitials = (name) => (name || "Guest").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function InformationItem({ icon: Icon, label, children }) {
  return <div className="chef-order-information-item"><Icon size={19} /><span><small>{label}</small><strong>{children}</strong></span></div>;
}

export function ChefOrderDetails({ order, busy, disabled, onUpdate }) {
  const tables = tablesFor(order);
  const actions = CHEF_ORDER_ACTIONS[order.status] || [];
  const floors = [...new Set(tables.map((table) => table.floor_name).filter(Boolean))];
  return <>
    <header className="chef-order-detail-heading">
      <span className="chef-orders-eyebrow">ORDER DETAILS</span>
      <span>#{order.id.slice(0, 8).toUpperCase()}</span>
    </header>
    <div className="chef-order-detail-hero">
      <div className="chef-order-detail-tags">
        <span className={`chef-order-status ${tone(order.status)}`}>{statusLabel(order.status)}</span>
        <span>{sourceLabel(order)}</span><span>{serviceLabel(order)}</span>
      </div>
      <div className="chef-order-detail-guest">
        <span className="chef-order-avatar">{guestInitials(order.customer_name)}</span>
        <div><h3>{order.customer_name || "Guest order"}</h3><p>{itemCount(order)} {itemCount(order) === 1 ? "item" : "items"} to {order.service_type === "TAKEAWAY" ? "pack for collection" : "prepare for the table"}</p></div>
      </div>
      <div className="chef-order-detail-hero-footer"><Clock3 size={15} /><span>Received {formatLocalDateTime(order.created_at)}</span></div>
    </div>

    <section className="chef-order-information">
      <h3>Service information</h3>
      <div className="chef-order-information-grid">
        <InformationItem icon={CalendarDays} label="Service date">{order.reservation?.reservation_date ? formatLocalDate(order.reservation.reservation_date) : formatLocalDate(order.created_at)}</InformationItem>
        <InformationItem icon={Clock3} label={order.reservation?.start_time ? "Reservation time" : "Order received"}>{order.reservation?.start_time ? formatWallTime(order.reservation.start_time) : formatLocalTime(order.created_at)}</InformationItem>
        <InformationItem icon={Package} label="Service type">{serviceLabel(order)}</InformationItem>
        <InformationItem icon={Table2} label="Tables">{order.service_type === "TAKEAWAY" ? "Pack for collection" : tables.map((table) => `Table ${table.table_number}`).join(", ") || "Not assigned"}</InformationItem>
        <InformationItem icon={MapPin} label="Floor / zone">{floors.join(", ") || "Not specified"}</InformationItem>
        {order.reservation?.number_of_guests && <InformationItem icon={Users} label="Party size">{order.reservation.number_of_guests} guests</InformationItem>}
      </div>
    </section>

    <section className="chef-order-dishes">
      <div className="chef-order-section-heading"><h3>Items to prepare</h3><span>{itemCount(order)} {itemCount(order) === 1 ? "item" : "items"}</span></div>
      {(order.items || []).length ? <ul>{order.items.map((item, index) => <li key={`${item.variant_id || item.food_name}-${index}`}>
        {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <span className="chef-order-food-placeholder"><Utensils size={20} /></span>}
        <div><strong>{item.food_name}</strong>{item.variant_name && <span>{item.variant_name}</span>}{item.description && <small>{item.description}</small>}</div>
        <span className="chef-order-quantity">×{item.quantity}</span>
      </li>)}</ul> : <p className="chef-order-muted">No item details are available for this order.</p>}
    </section>

    {order.customer_note && <section className="chef-order-kitchen-note"><h3><AlertTriangle size={17} />Preparation &amp; allergy notes</h3><p>{order.customer_note}</p></section>}
    {order.reservation?.special_request && <section className="chef-order-visit-note"><h3>Visit request</h3><p>{order.reservation.special_request}</p></section>}
    {order.status_reason && <section className="chef-order-visit-note"><h3>Status note</h3><p>{order.status_reason}</p></section>}

    <section className="chef-order-preparation-actions">
      <h3>Kitchen progress</h3>
      {actions.length ? <div>{actions.map((status) => <button type="button" key={status} disabled={busy || disabled} onClick={() => onUpdate(order.id, status)}><ChefHat size={17} />{busy ? "Updating…" : ACTION_LABELS[status]}</button>)}</div>
        : <p className="chef-order-muted">{order.status === "PLACED" ? "Awaiting manager acceptance before preparation can begin." : ["SERVED", "COMPLETED"].includes(order.status) ? "This order has been served. No further kitchen action is needed." : "No kitchen action is available for this order."}</p>}
    </section>
  </>;
}

export default function ChefOrdersWorkspace({ orders, total, calendarOrderCounts, month, selectedDate, loading, initialLoading, refreshing, error, notice, busy, realtimeStatus, filters, pagination, onSearch, onStatus, onSort, onResetFilters, onSelectDate, onMonthChange, onToday, onRefresh, onUpdate }) {
  const [selectedId, setSelectedId] = useState("");
  const details = useRef(null);
  const calendarSummary = useMemo(() => Object.fromEntries(Object.entries(calendarOrderCounts || {}).map(([date, count]) => [date, { orders_count: count }])), [calendarOrderCounts]);
  const sortedOrders = [...orders.filter(activeOrder), ...orders.filter((order) => !activeOrder(order))];
  const selectedOrder = sortedOrders.find((order) => order.id === selectedId) || sortedOrders[0];
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const connectionLabel = realtimeStatus === "connected" ? "Live updates connected" : realtimeStatus === "reconnecting" ? "Reconnecting to live updates…" : realtimeStatus === "disconnected" ? "Live updates disconnected · Refresh to sync" : "Connecting to live updates…";
  function selectOrder(id) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 760px)").matches) details.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  return <div className="orders-page orders-page-chef chef-orders-workspace-page">
    <header className="chef-orders-page-heading">
      <div><span className="chef-orders-eyebrow">YOUR KITCHEN, IN SYNC</span><h2>Kitchen orders</h2><p>View your orders by date and keep preparation moving.</p><span className="chef-orders-connection" role="status">{connectionLabel}</span></div>
      <button type="button" className="chef-orders-refresh" onClick={onRefresh} disabled={loading}><RefreshCw size={16} />Refresh</button>
    </header>
    <div className="chef-orders-toolbar" aria-label="Kitchen order filters">
      <label className="chef-orders-search"><Search size={17} /><input type="search" aria-label="Search order ID, customer, or item" value={filters.search} onChange={(event) => onSearch(event.target.value)} placeholder="Search orders, guests, dishes…" /></label>
      <select aria-label="Filter kitchen orders by status" value={filters.status} onChange={(event) => onStatus(event.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active orders</option>{STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
      <select aria-label="Sort kitchen orders" value={filters.sort} onChange={(event) => onSort(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
      <button type="button" onClick={onResetFilters}>Clear filters</button>
    </div>
    {notice && <p className="chef-orders-notice" role="status">{notice}</p>}
    {error && <div className="chef-orders-error" role="alert"><span>{error}</span><button type="button" onClick={onRefresh} disabled={loading}>Try again</button></div>}
    <ReservationDateStrip month={month} selectedDate={selectedDate} calendarDays={calendarSummary} onSelect={onSelectDate} onMonthChange={onMonthChange} onToday={onToday} label="Orders calendar" activityLabel="order" activityPluralLabel="orders" />
    {refreshing && <RefreshIndicator active label="Updating kitchen orders…" />}
    <div className="chef-orders-workspace">
      <aside className="chef-orders-list-panel" aria-label="Orders for selected date">
        <header className="chef-orders-list-heading"><div><span className="chef-orders-eyebrow">DAILY OVERVIEW</span><h3>Kitchen orders</h3><p>{selectedLabel}</p></div><span aria-label={`${total} orders`}>{total}</span></header>
        <div className="chef-orders-list-scroll">
          {initialLoading ? <LoadingState variant="list" label="Loading kitchen orders…" /> : error ? <div className="chef-orders-empty"><AlertTriangle size={28} /><strong>Orders unavailable</strong><p>Refresh to load the kitchen orders.</p></div> : sortedOrders.length ? <>
            {sortedOrders.map((order, index) => <Fragment key={order.id}>
              {(index === 0 || activeOrder(order) !== activeOrder(sortedOrders[index - 1])) && <h4 className="chef-orders-list-group"><ChefHat size={15} />{activeOrder(order) ? "Active orders" : "Served & closed"}</h4>}
              <article className={`chef-order-list-card${selectedOrder?.id === order.id ? " selected" : ""}`}>
                <button type="button" className="chef-order-card-select" aria-label={`View order ${order.id.slice(0, 8).toUpperCase()} for ${order.customer_name || "Guest"}`} aria-pressed={selectedOrder?.id === order.id} aria-controls="chef-order-detail-panel" onClick={() => selectOrder(order.id)}>
                  <div className="chef-order-card-tags"><span>#{order.id.slice(0, 8).toUpperCase()}</span><span>{sourceLabel(order)}</span></div>
                  <div className="chef-order-card-guest"><span className="chef-order-avatar">{guestInitials(order.customer_name)}</span><span><strong>{order.customer_name || "Guest order"}</strong><small>{serviceLabel(order)} · {itemCount(order)} {itemCount(order) === 1 ? "item" : "items"}</small></span><ChevronRight size={17} /></div>
                  <div className="chef-order-card-meta"><span><Clock3 size={14} />{formatLocalTime(order.created_at)}</span><span><Table2 size={14} />{order.service_type === "TAKEAWAY" ? "Collection" : tablesFor(order).map((table) => `Table ${table.table_number}`).join(", ") || "No table"}</span></div>
                  <div className={`chef-order-card-status ${tone(order.status)}`}><span>{statusLabel(order.status)}</span><small>{selectedOrder?.id === order.id ? "Viewing details" : "View order"}</small></div>
                </button>
              </article>
            </Fragment>)}
            <Pagination page={pagination.page} pageSize={pagination.pageSize} total={total} onPageChange={pagination.onPageChange} label="kitchen orders" />
          </> : <div className="chef-orders-empty"><CalendarDays size={28} /><strong>{calendarOrderCounts?.[selectedDate] ? "No orders match these filters" : "No orders on this date"}</strong><p>Choose another date or adjust your search and status filters.</p></div>}
        </div>
      </aside>
      <section ref={details} id="chef-order-detail-panel" className="chef-order-detail-panel" aria-label="Kitchen order details" aria-busy={loading}>
        {initialLoading ? <LoadingState variant="cards" label="Loading order details…" /> : !error && selectedOrder ? <ChefOrderDetails order={selectedOrder} busy={busy === selectedOrder.id} disabled={loading || Boolean(busy)} onUpdate={onUpdate} /> : <div className="chef-order-detail-empty"><span><ChefHat size={32} /></span><h3>Your kitchen, at a glance</h3><p>{error ? "Refresh to load order details and kitchen actions." : "Choose a date with orders to view dishes, service details, and preparation notes here."}</p></div>}
      </section>
    </div>
  </div>;
}
