import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCheck, Clock3, Package, RefreshCw, ShoppingBag, Soup, Timer } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";
import { BarChart, DonutChart, EmptyState } from "../../components/manager/DashboardCharts.jsx";
import useChefDashboard from "../../hooks/useChefDashboard.js";
import { requestJson } from "../../lib/authApi.js";
import { confirmAction } from "../../lib/confirmDialog.js";
import { createKitchenActions, elapsedLabel, kitchenInstant, KITCHEN_ACTION_LABELS, orderReference, preparationLabel } from "../../lib/chefDashboard.js";
import { STATUS_COLORS, statusLabel } from "../../lib/managerDashboard.js";
import "../../assets/css/ManagerDashboardPage.css";
import "../../assets/css/ChefDashboardPage.css";

const volumeSeries = [{ key: "total", name: "Orders received", color: "#7c2d3c" }];

export default function ChefDashboardPage() {
  const { chef } = useOutletContext();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("today");
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ period, status, page, page_size: 8 }), [period, status, page]);
  const { data, loading, error, refresh, connection } = useChefDashboard(params, Boolean(chef));
  const [busy, setBusy] = useState(new Set());
  const [notice, setNotice] = useState({ message: "", error: false });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const updateOrder = useMemo(() => createKitchenActions({
    request: requestJson, refresh, confirm: confirmAction,
    onBusy: (id, value) => {
      if (mounted.current) setBusy((current) => { const next = new Set(current); value ? next.add(id) : next.delete(id); return next; });
    },
    onNotice: (next) => { if (mounted.current) setNotice(next); },
  }), [refresh]);
  const selectStatus = useCallback((value) => { setStatus(value); setPage(1); }, []);

  return <ChefLayout title="Kitchen Dashboard">
    <div className="chef-live-dashboard">
      <PortalBreadcrumb home={{ label: "Home", to: "/chef/dashboard" }} items={[{ label: "Kitchen Dashboard" }]} />
      <div className="kitchen-welcome">
        <div><h2>Welcome, {chef?.name?.trim().split(/\s+/)[0] || "Chef"}</h2><p>Your kitchen, at a glance.</p></div>
        <div className="kitchen-refresh-info">
          {data && <><time dateTime={data.today}>{new Intl.DateTimeFormat("en-IN", { timeZone: data.timezone, dateStyle: "full" }).format(new Date(data.as_of))}</time>
            <span>Updated {kitchenInstant(data.as_of, data.timezone)} · {data.timezone}</span></>}
          <span className="kitchen-connection"><i className={connection === "connected" ? "connected" : ""} />{connection === "connected" ? "Live updates connected" : "Reconnecting live updates · refreshes every 30 seconds"}</span>
          <div className="kitchen-header-controls"><ThemeToggle /><button type="button" onClick={refresh} disabled={loading}><RefreshCw size={15} />{loading ? "Refreshing…" : "Refresh"}</button></div>
        </div>
      </div>
      <KitchenFeedback loading={loading} error={error} hasData={Boolean(data)} refresh={refresh} />
      {notice.message && <p className={notice.error ? "kitchen-feedback error" : "kitchen-feedback"} role={notice.error ? "alert" : "status"}>{notice.message}</p>}
      {data && <KitchenDashboardContent data={data} period={period} setPeriod={setPeriod} status={status} setStatus={selectStatus}
        setPage={setPage} busy={busy} updateOrder={updateOrder} loading={loading} actionsDisabled={Boolean(error)} navigate={navigate} />}
    </div>
  </ChefLayout>;
}

export function KitchenFeedback({ loading, error, hasData, refresh }) {
  if (error) return <div className="kitchen-feedback error" role="alert"><p>{error}{hasData && " Showing the last successful update; order actions are paused until refresh succeeds."}</p><button type="button" onClick={refresh}>Try again</button></div>;
  if (loading && !hasData) return <div role="status" aria-live="polite" className="kitchen-loading"><span>Loading kitchen operations…</span><div className="kitchen-kpis">{Array.from({ length: 6 }, (_, index) => <div className="kitchen-skeleton" key={index} aria-hidden="true" />)}</div></div>;
  return null;
}

export function KitchenDashboardContent({ data, period = "today", setPeriod, status = "ACTIVE", setStatus, setPage, busy = new Set(), updateOrder, loading = false, navigate, actionsDisabled = false }) {
  const { summary, active_orders: queue, performance, timezone } = data;
  const [now, setNow] = useState(Date.now());
  const observedAt = useRef(Date.now());
  useEffect(() => { observedAt.current = Date.now(); setNow(Date.now()); }, [data.as_of]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setNow(Date.now()); }, 15000);
    return () => window.clearInterval(timer);
  }, []);
  const ageIncrement = Math.max(0, Math.floor((now - observedAt.current) / 1000));
  const formatAge = (seconds) => elapsedLabel(seconds == null ? null : seconds + ageIncrement);
  return <>
    <section className="kitchen-kpis" aria-label="Kitchen summary">
      <Kpi title="Today's Orders" value={summary.today_orders} icon={Package} detail={`${summary.yesterday_orders} yesterday${summary.orders_change_percent == null ? " · No percentage baseline" : ` · ${summary.orders_change_percent > 0 ? "+" : ""}${summary.orders_change_percent}%`}`} />
      <Kpi title="Pending Orders" value={summary.pending_orders} icon={Clock3} detail="Live · Placed and accepted" />
      <Kpi title="Preparing Orders" value={summary.preparing_orders} icon={Soup} detail="Live · In preparation" />
      <Kpi title="Ready Orders" value={summary.ready_orders} icon={CheckCheck} detail="Live · Ready for serving" />
      <Kpi title="Completed Orders" value={summary.completed_orders} icon={ShoppingBag} detail="Completed today" />
      <Kpi title="Average Preparation Time" value={preparationLabel(summary.average_preparation_minutes)} icon={Timer} detail={`${performance.measured_today} measured orders ready today`} />
    </section>

    <div className="kitchen-operations-grid">
      <KitchenPanel title="Active Kitchen Orders" subtitle={`${queue.total} matching orders · Oldest first · All receipt dates`}
        action={<label className="kitchen-filter">Order status<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ACTIVE">All active</option>{["PLACED", "ACCEPTED", "PREPARING", "READY"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select></label>}>
        <div aria-busy={loading} className="kitchen-queue">
          {queue.items.length ? queue.items.map((order) => <KitchenOrderCard key={order.id} order={order} timezone={timezone} age={formatAge(order.elapsed_seconds)}
            busy={busy.has(order.id)} updateOrder={updateOrder} disabled={loading || actionsDisabled} />) : <EmptyState>No active orders match this filter.</EmptyState>}
        </div>
        <Pagination page={queue.page} pageSize={queue.page_size} total={queue.total} onPageChange={setPage} label="kitchen orders" />
        <button className="kitchen-all-orders" type="button" onClick={() => navigate("/chef/orders")}>Open kitchen order management</button>
      </KitchenPanel>
      <KitchenPanel title="Upcoming Reservations" subtitle="Next 8 confirmed arrivals · Kitchen planning">
        {data.upcoming_reservations.length ? <div className="kitchen-reservations">{data.upcoming_reservations.map((visit) => <article key={visit.id}>
          <div className="kitchen-row"><strong>RES-{visit.id.slice(0, 8).toUpperCase()}</strong><StatusBadge status={visit.status} /></div>
          <p><CalendarDays size={14} /><time dateTime={visit.arrival_at}>{kitchenInstant(visit.arrival_at, timezone, true)}</time> · {visit.number_of_guests} guests</p>
          <p>{tableLabel(visit.tables)}</p>
          {visit.preorder_items.length > 0 && <div className="kitchen-preorder"><strong>Preordered food</strong><ItemList items={visit.preorder_items} /></div>}
        </article>)}</div> : <EmptyState>No upcoming confirmed reservations.</EmptyState>}
      </KitchenPanel>
    </div>

    <div className="kitchen-analytics-heading"><h2>Kitchen analytics</h2><label className="kitchen-filter">Order analytics date range<select value={period} onChange={(event) => setPeriod(event.target.value)}>
      <option value="today">Today</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option>
    </select></label></div>
    <p className="kitchen-note">{data.start_date} – {data.end_date} · {timezone} · Orders grouped by receipt date. Live operations remain current.</p>
    <div className="kitchen-analytics-grid">
      <KitchenPanel title="Order Volume" subtitle={data.group_by === "hour" ? "Today · Hourly receipts" : "Selected period · Daily receipts"}>
        {data.group_by === "hour" ? <HourlyVolume points={data.order_volume} /> : <BarChart points={data.order_volume} series={volumeSeries} group="day" label="Orders received over time" />}
      </KitchenPanel>
      <KitchenPanel title="Order Status Distribution" subtitle="Current status of orders received in selected period">
        <DonutChart items={data.status_distribution.map((item) => ({ label: statusLabel(item.status), value: item.count, color: STATUS_COLORS[item.status] }))} label="Orders" />
      </KitchenPanel>
      <KitchenPanel title="Preparation Performance" subtitle="Last 7 days · Actual start to ready time">
        <PreparationChart points={data.preparation_performance} />
      </KitchenPanel>
    </div>

    <div className="kitchen-operations-grid">
      <KitchenPanel title="Kitchen Performance Overview" subtitle="Today and the current queue">
        <dl className="kitchen-performance">
          <div><dt>Orders prepared today</dt><dd>{performance.prepared_today}</dd></div>
          <div><dt>Average preparation time</dt><dd>{preparationLabel(performance.average_preparation_minutes)}</dd></div>
          <div><dt>Longest active order age</dt><dd>{formatAge(performance.longest_active_seconds)}</dd></div>
          <div><dt>Delayed orders</dt><dd>{performance.delayed_orders ?? "Unavailable"}</dd></div>
        </dl>
        <p className="kitchen-note">{performance.measured_today} orders have valid preparation timestamps today. {performance.delay_threshold_minutes == null ? "No kitchen delay threshold is configured." : `Delay threshold: ${performance.delay_threshold_minutes} minutes.`}</p>
      </KitchenPanel>
      {data.recent_activity.length > 0 && <KitchenPanel title="Recent Kitchen Activity" subtitle="Persisted order events · Latest recorded changes">
        <ol className="kitchen-activity">{data.recent_activity.map((event) => <li key={event.id}>
          <span className="kitchen-event-icon" style={{ color: STATUS_COLORS[event.status] }} aria-hidden="true">{event.status === "READY" || event.status === "COMPLETED" ? <CheckCheck size={16} /> : <Clock3 size={16} />}</span>
          <div><strong>{event.description}</strong><span>{orderReference(event.order_id)}</span><time dateTime={event.occurred_at}>{kitchenInstant(event.occurred_at, timezone, true)}</time></div>
        </li>)}</ol>
      </KitchenPanel>}
    </div>
    <details className="kitchen-methodology"><summary>How kitchen metrics are calculated</summary><ul>{data.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
  </>;
}

export function KitchenOrderCard({ order, timezone, age, busy, updateOrder, disabled }) {
  return <article className={`kitchen-order-card status-${order.status.toLowerCase()}`}>
    <div className="kitchen-row"><strong>{orderReference(order.id)}</strong><StatusBadge status={order.status} /></div>
    <p className="kitchen-table-label">{order.service_type === "TAKEAWAY" ? "Takeaway" : tableLabel(order.tables)}</p>
    <div className="kitchen-row kitchen-order-time"><time dateTime={order.created_at}>Received {kitchenInstant(order.created_at, timezone, true)}</time><span><Clock3 size={13} />{age} ago</span></div>
    {order.age_rank === 1 && <span className="kitchen-age-priority">Oldest active order</span>}
    <p className="kitchen-item-count">{order.item_count} items</p><ItemList items={order.items} />
    {order.customer_note && <p className="kitchen-instructions"><strong>Preparation instructions:</strong> {order.customer_note}</p>}
    <details className="kitchen-order-details"><summary>View order details</summary><dl>
      <div><dt>Order reference</dt><dd>{order.id}</dd></div>
      <div><dt>Accepted</dt><dd>{order.accepted_at ? kitchenInstant(order.accepted_at, timezone, true) : "Not recorded"}</dd></div>
      <div><dt>Preparation started</dt><dd>{order.preparation_started_at ? kitchenInstant(order.preparation_started_at, timezone, true) : "Not recorded"}</dd></div>
      <div><dt>Ready</dt><dd>{order.ready_at ? kitchenInstant(order.ready_at, timezone, true) : "Not recorded"}</dd></div>
    </dl></details>
    <div className="kitchen-order-actions">{order.allowed_actions.map((action) => KITCHEN_ACTION_LABELS[action] && <button type="button" key={action} disabled={busy || disabled}
      onClick={() => updateOrder(order, action)} aria-label={`${KITCHEN_ACTION_LABELS[action]} for ${orderReference(order.id)}`}>{busy ? "Updating…" : KITCHEN_ACTION_LABELS[action]}</button>)}
      {order.status === "PLACED" && <span>Awaiting manager acceptance</span>}
    </div>
  </article>;
}

function KitchenPanel({ title, subtitle, action, children }) {
  return <section className="kitchen-panel"><div className="kitchen-panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function Kpi({ title, value, detail, icon: Icon }) {
  return <article className="kitchen-kpi"><div><h3>{title}</h3><Icon size={18} /></div><strong>{value}</strong><p>{detail}</p></article>;
}
function StatusBadge({ status }) {
  return <span className={`kitchen-status ${status.toLowerCase()}`}><i style={{ background: STATUS_COLORS[status] }} />{statusLabel(status)}</span>;
}
function ItemList({ items }) {
  return <ul className="kitchen-items">{items.map((item, index) => <li key={index}><strong>{item.quantity} ×</strong> {item.food_name}{item.variant_name && <span> · {item.variant_name}</span>}</li>)}</ul>;
}
function tableLabel(tables) {
  return tables.length ? tables.map((table) => `Table ${table.table_number}${table.floor_name ? ` · ${table.floor_name}` : ""}`).join(" / ") : "No table assigned";
}

function HourlyVolume({ points }) {
  if (!points.some((point) => point.total > 0)) return <EmptyState>No orders received today.</EmptyState>;
  const max = Math.max(...points.map((point) => point.total));
  return <div className="kitchen-chart-scroll" tabIndex={0} role="region" aria-label="Hourly order volume. Scroll to view all hours.">
    <svg viewBox="0 0 760 200" className="kitchen-hourly-chart" role="img" aria-label="Orders received by restaurant-local hour">
      {[0, Math.ceil(max / 2), max].map((tick, index) => <g key={index}><line x1="40" x2="750" y1={158 - tick / max * 140} y2={158 - tick / max * 140} className="manager-chart-gridline" /><text x="32" y={162 - tick / max * 140} textAnchor="end">{tick}</text></g>)}
      {points.map((point, index) => <g key={point.date}><rect x={46 + index * 29} y={158 - point.total / max * 140} width="17" height={point.total / max * 140} rx="3" fill="#7c2d3c" tabIndex={0} aria-label={`${point.date.slice(11)}: ${point.total} orders`}><title>{`${point.date.slice(11)} · ${point.total} orders`}</title></rect><text x={54 + index * 29} y="183" textAnchor="middle">{point.date.slice(11, 13)}</text></g>)}
    </svg>
  </div>;
}

function PreparationChart({ points }) {
  if (!points.some((point) => point.average_minutes != null)) return <EmptyState>No measured preparation times in the last 7 days. Orders need recorded start and ready timestamps.</EmptyState>;
  const max = Math.max(1, ...points.map((point) => point.average_minutes ?? 0));
  return <><div className="kitchen-chart-scroll" tabIndex={0} role="region" aria-label="Preparation time by day. Missing measurements are marked unavailable.">
    <svg viewBox="0 0 500 200" className="kitchen-prep-chart" role="img" aria-label="Average preparation time in minutes over the last 7 days">
      {[0, max / 2, max].map((tick, index) => <g key={index}><line x1="60" x2="490" y1={158 - tick / max * 140} y2={158 - tick / max * 140} className="manager-chart-gridline" /><text x="50" y={162 - tick / max * 140} textAnchor="end">{Math.round(tick * 10) / 10} min</text></g>)}
      {points.map((point, index) => <g key={point.date}>
        {point.average_minutes == null ? <text x={90 + index * 60} y="150" textAnchor="middle">N/A<title>{`${point.date} · No measured preparation times`}</title></text> : <g tabIndex={0} aria-label={`${point.date}: ${preparationLabel(point.average_minutes)}, ${point.measured_orders} measured orders`}>
          <title>{`${point.date} · ${preparationLabel(point.average_minutes)} · ${point.measured_orders} measured orders`}</title>
          <rect x={77 + index * 60} y={158 - point.average_minutes / max * 140} width="26" height={point.average_minutes / max * 140} fill="#ef7917" rx="3" />
          {point.average_minutes === 0 && <circle cx={90 + index * 60} cy="158" r="3" fill="#ef7917" />}
        </g>}
        <text x={90 + index * 60} y="183" textAnchor="middle">{point.date.slice(5)}</text>
      </g>)}
    </svg>
  </div><p className="kitchen-note">N/A means no valid measurement. Days use the order’s ready timestamp.</p></>;
}
