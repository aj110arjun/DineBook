import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CircleDollarSign, Plus, RefreshCw, ShoppingBasket, Star, Table2, Tag, Users, Receipt } from "lucide-react";
import { usePageState } from "../../state/usePageState.js";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { BarChart, DonutChart, EmptyState } from "../../components/manager/DashboardCharts.jsx";
import useManagerDashboard from "../../hooks/useManagerDashboard.js";
import { comparison, formatCurrency, formatDate, formatInstant, formatNumber, PERIOD_PRESETS, presetPeriod, STATUS_COLORS, statusLabel, validatePeriod } from "../../lib/managerDashboard.js";
import "../../assets/css/ManagerDashboardPage.css";

const revenueSeries = [{ key: "revenue", name: "Collected less refunds", color: "#7c2d3c" }, { key: "net", name: "After commission", color: "#2675c9" }];
const orderSeries = [{ key: "completed", name: "Completed", color: "#2d8737" }, { key: "pending", name: "Active / pending", color: "#ef7917" }, { key: "cancelled", name: "Cancelled / rejected", color: "#c44758" }];
const visitSeries = [{ key: "completed", name: "Completed", color: "#2d8737" }, { key: "pending", name: "Pending / confirmed / seated", color: "#2675c9" }, { key: "cancelled", name: "Cancelled / rejected / no-show", color: "#c44758" }];
const customerSeries = [{ key: "new", name: "New in interval", color: "#7c2d3c" }, { key: "returning", name: "Returning in interval", color: "#2675c9" }];
const distribution = (items) => items.map(({ status, count }) => ({ label: statusLabel(status), value: count, color: STATUS_COLORS[status] }));

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [filters, set] = usePageState("ManagerDashboardFilters", () => {
    const period = presetPeriod("last30");
    return { preset: "last30", period, draft: period, group: "auto", sort: "quantity", filterError: "" };
  });
  const params = useMemo(() => ({ ...filters.period, group_by: filters.group, popular_sort: filters.sort }), [filters.period, filters.group, filters.sort]);
  const validation = validatePeriod(params.start_date, params.end_date, params.group_by);
  const { data, loading, error, refresh } = useManagerDashboard(params, !validation);

  function selectPreset(value) {
    set.preset(value);
    set.filterError("");
    if (value !== "custom") {
      const period = presetPeriod(value);
      set.period(period);
      set.draft(period);
    }
  }
  function applyCustom(event) {
    event.preventDefault();
    const message = validatePeriod(filters.draft.start_date, filters.draft.end_date, filters.group);
    set.filterError(message);
    if (!message) set.period({ ...filters.draft });
  }

  return <ManagerLayout title="Dashboard">
    <div className="manager-dashboard-content manager-analytics">
      <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Dashboard" }]} className="manager-breadcrumb" />
      <div className="manager-heading">
        <div><h2>Welcome{data?.manager_name ? `, ${data.manager_name}` : ""}</h2>
          <p>{data?.restaurant_name || "Your restaurant"} · Operations and performance</p></div>
      </div>
      <div className="manager-quick-actions">
        {[
          { icon: Plus, title: "Add a menu item", detail: "Add a dish guests can order", path: "/manager/menu" },
          { icon: Tag, title: "Create an offer", detail: "Share a deal with guests", path: "/manager/offers" },
          { icon: Table2, title: "Set up tables", detail: "Arrange floors and seating", path: "/manager/tables" },
          { icon: CalendarDays, title: "View reservations", detail: "See upcoming guest bookings", path: "/manager/reservations" },
        ].map(({ icon: Icon, title, detail, path }) => <button type="button" key={title} onClick={() => navigate(path)}>
          <span className="manager-action-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{detail}</small></span>
        </button>)}
      </div>

      <div className="manager-dashboard-filters">
        <label>Period<select value={filters.preset} onChange={(event) => selectPreset(event.target.value)}>{PERIOD_PRESETS.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>Chart interval<select value={filters.group} onChange={(event) => set.group(event.target.value)}>
          {[["auto", "Automatic"], ["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"], ["year", "Yearly"]].map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select></label>
        <button type="button" className="manager-dashboard-refresh" onClick={refresh} disabled={loading || !!validation}><RefreshCw size={16} className={loading ? "manager-refresh-spinning" : ""} />{loading ? "Loading…" : "Refresh"}</button>
        {filters.preset === "custom" && <form onSubmit={applyCustom} className="manager-dashboard-date-range">
          <label>Start date<input type="date" min="2000-01-01" max="2099-12-31" required value={filters.draft.start_date} onChange={(event) => set.draft((current) => ({ ...current, start_date: event.target.value }))} /></label>
          <label>End date<input type="date" min="2000-01-01" max="2099-12-31" required value={filters.draft.end_date} onChange={(event) => set.draft((current) => ({ ...current, end_date: event.target.value }))} /></label>
          <button type="submit">Apply range</button>
        </form>}
      </div>
      {(validation || filters.filterError) && <p role="alert" className="manager-dashboard-error">{validation || filters.filterError}</p>}
      <DashboardFeedback error={error} loading={loading} validation={validation} refresh={refresh} />
      {data && !loading && !validation && <DashboardContent data={data} sort={filters.sort} setSort={set.sort} navigate={navigate} />}
    </div>
  </ManagerLayout>;
}

export function DashboardFeedback({ error, loading, validation, refresh }) {
  if (validation) return null;
  if (error) return <div role="alert" className="manager-dashboard-error"><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div>;
  if (loading) return <div role="status" aria-live="polite" className="manager-dashboard-loading">Loading restaurant performance…</div>;
  return null;
}

export function DashboardContent({ data, sort, setSort, navigate }) {
  const { overview, operations, period, live, revenue, reviews, customers } = data;
  const count = (statuses, status) => statuses.find((item) => item.status === status)?.count || 0;
  return <>
    <p className="manager-dashboard-period">{formatDate(period.start_date)} – {formatDate(period.end_date)} · {period.timezone}<br />
      Compared with {formatDate(period.previous_start_date)} – {formatDate(period.previous_end_date)}. Charts grouped {statusLabel(period.group_by)}.</p>
    <div className="manager-summary-grid">
      <SummaryCard title="Revenue after refunds" metric={overview.revenue} currency detail={`${formatCurrency(revenue.gross)} collected`} icon={CircleDollarSign} />
      <SummaryCard title="Total Orders" metric={overview.orders} detail={`${count(operations.order_status, "COMPLETED")} completed · ${formatNumber(Number(overview.orders.value) - count(operations.order_status, "COMPLETED") - count(operations.order_status, "CANCELLED") - count(operations.order_status, "REJECTED"))} active`} icon={ShoppingBasket} />
      <SummaryCard title="Reservations" metric={overview.reservations} detail={`${count(operations.reservation_status, "CONFIRMED")} confirmed · ${operations.expected_guests} expected guests`} icon={CalendarDays} />
      <SummaryCard title="Unique Customers" metric={overview.customers} detail={`${customers.new} new · ${customers.returning} returning`} icon={Users} />
      <SummaryCard title="Average Order Value" metric={overview.average_order_value} currency detail="Paid, non-cancelled orders" icon={Receipt} />
      <SummaryCard title="Table Occupancy · Live" value={`${live.tables.occupied} / ${live.tables.total}`} detail={`${live.tables.occupancy_percent}% occupied · ${live.tables.available} available`} icon={Table2} />
      <SummaryCard title="Average Rating" metric={reviews.total ? overview.rating : undefined} value={reviews.total ? `${formatNumber(reviews.average)} ★` : "—"} detail={`${reviews.total} published reviews in period`} icon={Star} />
    </div>

    <div className="manager-dashboard-grid">
      <Panel title="Revenue Overview" subtitle="INR · Collection and reversal dates">
        <BarChart points={data.revenue_chart} series={revenueSeries} group={period.group_by} currency label="Revenue over time in INR" />
        <div className="manager-financial-totals">
          {[["Gross collected", revenue.gross], ["Refunds", revenue.refunds], ["Commission, after reversals", revenue.commissions], ["Net after commission", revenue.net]].map(([name, value]) => <div key={name}><span>{name}</span><strong>{formatCurrency(value)}</strong></div>)}
        </div>
      </Panel>
      <Panel title="Order Statuses" subtitle="Selected period · Order creation date"><DonutChart items={distribution(operations.order_status)} label="Orders" /></Panel>
    </div>

    <div className="manager-dashboard-grid manager-middle-grid">
      <Panel title="Live Floor Status Summary" subtitle={`Current · Updated ${formatInstant(live.as_of)}`} action={<button type="button" onClick={() => navigate("/manager/tables")}>View all tables</button>}>
        {live.table_preview.length ? <div className="manager-table-grid">{live.table_preview.map((table) => <div className={`manager-table-card ${table.status}`} key={table.id}>
          <strong>Table {table.name}</strong><span>{table.floor} · {table.seats} seats</span><small>{statusLabel(table.status)}</small>
        </div>)}</div> : <EmptyState>No active tables. Set up floors and tables to view seating.</EmptyState>}
        <p className="manager-panel-note">{live.tables.total} active tables · {live.tables.reserved} reserved · {live.tables.maintenance} in maintenance. Showing up to 20 tables.</p>
      </Panel>
      <Panel title="Popular Items" subtitle="Paid orders · Sales after discounts, before tax" action={<label className="manager-dashboard-sort">Rank by<select aria-label="Rank popular items by" value={sort} onChange={(event) => setSort(event.target.value)}><option value="quantity">Most sold</option><option value="revenue">Highest revenue</option></select></label>}>
        {data.popular_items.length ? <div className="manager-popular-list">{data.popular_items.map((item, index) => <div key={item.key} className="manager-popular-item manager-popular-chart-item">
          <div><strong title={item.name}>{index + 1}. {item.name}</strong><span>{formatNumber(item.quantity)} sold · {formatCurrency(item.revenue)}</span>
            <div className="manager-popular-track" title={`${item.name}: ${item.quantity} sold, ${formatCurrency(item.revenue)}`}><i style={{ width: `${Number(sort === "revenue" ? item.revenue : item.quantity) / Math.max(1, ...data.popular_items.map((row) => Number(sort === "revenue" ? row.revenue : row.quantity))) * 100}%` }} /></div>
          </div>
        </div>)}</div> : <EmptyState>No qualifying paid items in this period.</EmptyState>}
      </Panel>
    </div>

    <div className="manager-bottom-grid">
      <Panel title="Order Trends" subtitle={`${operations.order_completion_percent}% completed · Order creation dates`}><BarChart points={operations.order_trend} series={orderSeries} group={period.group_by} label="Orders over time" /><PeakSummary title="Peak order hours" items={operations.peak_order_hours} hours /></Panel>
      <Panel title="Reservation Trends" subtitle={`${operations.reservation_completion_percent}% completed · Scheduled arrival dates`}><BarChart points={operations.reservation_trend} series={visitSeries} group={period.group_by} label="Reservations over time" /><PeakSummary title="Peak arrival hours" items={operations.peak_reservation_hours} hours /><PeakSummary title="Peak booking days" items={operations.peak_reservation_days} /></Panel>
    </div>
    <div className="manager-dashboard-grid">
      <Panel title="Customer Growth" subtitle={`${customers.retention_percent}% returning in period · Known customer accounts`}>
        <BarChart points={customers.trend} series={customerSeries} group={period.group_by} label="Unique restaurant customers over time" />
        <p className="manager-panel-note">New customers are identified from their full restaurant history. A customer can appear in more than one chart interval.</p>
      </Panel>
      <Panel title="Reservation Statuses" subtitle={`${operations.expected_guests} expected guests · Average party ${formatNumber(operations.average_party_size)}`}><DonutChart items={distribution(operations.reservation_status)} label="Reservations" /></Panel>
    </div>
    <div className="manager-bottom-grid">
      <Panel title="Payment Methods" subtitle="Captured volume · Before refunds"><DonutChart items={data.payment_methods.map((item) => ({ label: `${statusLabel(item.method)} · ${item.count} payments`, value: item.amount }))} label="Collected payments" currency /></Panel>
      <Panel title="Reviews and Ratings" subtitle="Published reviews in selected period" action={<button type="button" onClick={() => navigate("/manager/reviews")}>View reviews</button>}>
        <DonutChart items={reviews.distribution.map((item) => ({ label: `${item.status} stars`, value: item.count }))} label="Published reviews" />
        {!!reviews.recent.length && <div className="manager-list">{reviews.recent.map((review) => <div key={review.id} className="manager-list-row manager-review-preview"><div><strong>{review.rating} ★ · {formatInstant(review.created_at)}</strong><p>{review.content}</p></div></div>)}</div>}
      </Panel>
    </div>

    <div className="manager-bottom-grid">
      <Panel title="Upcoming Reservations" subtitle="Live · Next scheduled arrivals" action={<button type="button" onClick={() => navigate("/manager/reservations")}>View all</button>}>
        {live.upcoming_reservations.length ? <div className="manager-list">{live.upcoming_reservations.map((reservation) => <div className="manager-list-row" key={reservation.id}>
          <div><strong>RES-{reservation.id.slice(0, 8).toUpperCase()}</strong><span>{reservation.guests} guests · {statusLabel(reservation.status)}</span></div><b>{formatDate(reservation.date)}<br />{reservation.time} IST</b>
        </div>)}</div> : <EmptyState>No upcoming reservations.</EmptyState>}
      </Panel>
      <Panel title="Recent Active Orders" subtitle="Live · Most recently placed" action={<button type="button" onClick={() => navigate("/manager/reservations")}>View reservations &amp; orders</button>}>
        {live.active_orders.length ? <div className="manager-list">{live.active_orders.map((order) => <div className="manager-list-row" key={order.id}>
          <div><button type="button" className="manager-order-link" onClick={() => navigate(`/manager/orders/${order.id}`)}>DB-{order.id.slice(0, 8).toUpperCase()}</button><span>{formatInstant(order.created_at)}</span></div>
          <div className="manager-order-row-right"><b>{formatCurrency(order.amount)}</b><span className={`manager-order-pill ${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span></div>
        </div>)}</div> : <EmptyState>No active orders.</EmptyState>}
      </Panel>
    </div>
    <details className="manager-dashboard-methodology"><summary>How these numbers are calculated</summary><ul>{data.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
  </>;
}

function Panel({ title, subtitle, action, children }) {
  return <section className="manager-panel"><div className="manager-panel-header"><div><h3>{title}</h3>{subtitle && <span>{subtitle}</span>}</div>{action}</div>{children}</section>;
}
function PeakSummary({ title, items, hours = false }) {
  return <p className="manager-panel-note"><strong>{title}: </strong>{items.length ? items.map((item) => `${hours ? `${item.label}:00` : item.label} (${formatNumber(item.count)})`).join(" · ") : "No qualifying activity"}</p>;
}
function SummaryCard({ title, metric, value, currency = false, detail, icon: Icon }) {
  const formatted = value ?? (currency ? formatCurrency(metric.value) : formatNumber(metric.value));
  return <article className="manager-summary-card"><div className="manager-summary-top"><span>{title}</span><div className="manager-summary-icon"><Icon size={16} /></div></div>
    <strong className="manager-summary-value">{formatted}</strong><div className="manager-summary-detail">
      {metric && <b className={Number(metric.change_percent) < 0 ? "manager-change-negative" : Number(metric.change_percent) > 0 ? "" : "manager-change-neutral"} title={`Previous period: ${currency ? formatCurrency(metric.previous) : formatNumber(metric.previous)}`}>{comparison(metric)}</b>}
      <span title={detail}>{detail}</span></div>
  </article>;
}
