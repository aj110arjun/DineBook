import LoadingState, { ErrorState, RefreshIndicator } from "../../components/ui/LoadingState.jsx";
import { Skeleton, SkeletonRows } from "../../components/ui/Skeleton.jsx";
import { SkeletonBars, SkeletonCopy, SkeletonDonut, SkeletonPairs } from "../../components/ui/DashboardSkeleton.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarDays, CheckCheck, CircleDollarSign, Clock3, CreditCard, RefreshCw, ShoppingBasket, Store, Users, Wallet } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminLedgerDownloads from "../../components/admin/AdminLedgerDownloads.jsx";
import AdminTrendChart from "../../components/admin/AdminTrendChart.jsx";
import { BarChart, DonutChart } from "../../components/manager/DashboardCharts.jsx";
import useAdminDashboard from "../../hooks/useAdminDashboard.js";
import { usePageState } from "../../state/usePageState.js";
import { formatCurrency as money, formatNumber as number, formatDate, formatInstant, ADMIN_PERIOD_PRESETS, presetPeriod, STATUS_COLORS, statusLabel, validatePeriod } from "../../lib/managerDashboard.js";
import "../../assets/css/ManagerDashboardPage.css";
import "../../assets/css/AdminDashboardPage.css";

const grossSeries = [{ key: "gross", name: "Gross transaction value", color: "#2e79bd" }, { key: "refunds", name: "Payment refunds", color: "#d05b65" }];
const commissionSeries = [{ key: "generated", name: "Generated", color: "#b66a77" }, { key: "collected_net", name: "Collected, net", color: "#318d70" }, { key: "outstanding", name: "Outstanding balance", color: "#b48430" }];
const volumeSeries = [{ key: "completed", name: "Completed", color: "#318d70" }, { key: "pending", name: "Active / pending", color: "#2e79bd" }, { key: "cancelled", name: "Cancelled / rejected", color: "#d05b65" }];
const distribution = (items) => items.map(({ status, count }) => ({ label: statusLabel(status), value: count, color: STATUS_COLORS[status] }));

export default function AdminDashboardPage() {
  const [filters, set] = usePageState("AdminDashboardFilters", () => {
    const period = presetPeriod("last30");
    return { preset: "last30", period, draft: period, group: "auto", error: "" };
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const params = { ...filters.period, group_by: filters.group };
  const validation = validatePeriod(params.start_date, params.end_date, params.group_by);
  const overview = useAdminDashboard("overview", params, !validation);
  const unappliedDates = filters.preset === "custom" && (filters.draft.start_date !== filters.period.start_date || filters.draft.end_date !== filters.period.end_date);
  function selectPreset(value) {
    set.preset(value);
    set.error("");
    if (value !== "custom") {
      const period = presetPeriod(value);
      set.period(period);
      set.draft(period);
    }
  }
  function applyRange(event) {
    event.preventDefault();
    const error = validatePeriod(filters.draft.start_date, filters.draft.end_date, filters.group);
    set.error(error);
    if (!error) set.period({ ...filters.draft });
  }
  return <AdminLayout title="Dashboard"><div className="admin-dashboard-content admin-analytics manager-analytics">
    <div className="admin-analytics-heading"><div><span className="admin-eyebrow">PLATFORM OVERVIEW</span><h2>Across DineBook</h2><p>Restaurant activity, customer growth and platform earnings.</p></div>
      <div className="admin-analytics-updated"><span className="admin-live-dot" />{overview.data ? `Updated ${formatInstant(overview.data.as_of)}` : "Database analytics"}</div></div>
    <div className="admin-analytics-filters">
      <label>Period<select value={filters.preset} onChange={(e) => selectPreset(e.target.value)}>{ADMIN_PERIOD_PRESETS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Chart interval<select value={filters.group} onChange={(e) => set.group(e.target.value)}>{[["auto", "Automatic"], ["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"], ["year", "Yearly"]].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="admin-analytics-actions">
        <AdminLedgerDownloads key={`${filters.period.start_date}:${filters.period.end_date}`} period={filters.period} disabled={Boolean(validation) || unappliedDates} />
        <button className="admin-analytics-refresh" type="button" disabled={overview.loading || !!validation} onClick={() => { overview.refresh(); setRefreshTick((v) => v + 1); }}><RefreshCw size={15} />Refresh</button>
      </div>
      {filters.preset === "custom" && <form className="admin-analytics-custom" onSubmit={applyRange}>
        <label>Start date<input type="date" required min="2000-01-01" max="2099-12-31" value={filters.draft.start_date} onChange={(e) => set.draft((d) => ({ ...d, start_date: e.target.value }))} /></label>
        <label>End date<input type="date" required min="2000-01-01" max="2099-12-31" value={filters.draft.end_date} onChange={(e) => set.draft((d) => ({ ...d, end_date: e.target.value }))} /></label><button type="submit">Apply range</button>
      </form>}
    </div>
    <p className="admin-period-label">{formatDate(params.start_date)} – {formatDate(params.end_date)} · Asia/Kolkata <span>Current account totals are labeled separately.</span></p>
    {(validation || filters.error) && <p role="alert" className="admin-analytics-error">{validation || filters.error}</p>}
    {!validation && <>
      <AdminDashboardFeedback {...overview} />
      {overview.data && <AdminDashboardContent data={overview.data} slot="top" />}
      <RestaurantSection key={`restaurants:${params.start_date}:${params.end_date}`} params={params} refreshTick={refreshTick} />
      {overview.data && <AdminDashboardContent data={overview.data} slot="bottom" />}
      {overview.loading && !overview.data && !overview.error && <div aria-hidden="true"><AdminDashboardSkeleton slot="bottom" /></div>}
      <ActivitySection key={`activity:${params.start_date}:${params.end_date}`} params={params} refreshTick={refreshTick} />
      {overview.data && <details className="admin-analytics-methodology"><summary>How these numbers are calculated</summary><ul>{overview.data.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>}
    </>}
  </div></AdminLayout>;
}

export function AdminDashboardFeedback({ loading, error, data, refresh, section = "overview" }) {
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!loading) return null;
  if (data) return <RefreshIndicator active />;
  const labels = { overview: "Loading platform analytics…", restaurants: "Loading restaurant performance…", activity: "Loading platform activity…" };
  return <LoadingState label={labels[section]}>{section === "overview" ? <AdminDashboardSkeleton slot="top" /> : section === "restaurants" ? <RestaurantSkeleton /> : <ActivitySkeleton />}</LoadingState>;
}

function Metric({ title, value, icon: Icon, currency = false, detail, loading = false }) {
  return <article className="admin-kpi"><div><span>{loading ? <SkeletonCopy>{title}</SkeletonCopy> : title}</span>{loading ? <Skeleton width={17} height={17} /> : <Icon size={17} aria-hidden="true" />}</div><strong>{loading ? <Skeleton width="60%" height="1.25em" /> : currency ? money(value) : number(value)}</strong><small>{loading ? <SkeletonCopy>{detail}</SkeletonCopy> : detail}</small></article>;
}
function Panel({ title, note, children, action, className = "" }) {
  return <section className={`admin-analytics-panel ${className}`}><header><div><h3>{title}</h3>{note && <p>{note}</p>}</div>{action}</header>{children}</section>;
}
function Totals({ items }) {
  return <dl className="admin-inline-totals">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function TrendSkeleton({ series = 2 }) {
  return <div className="admin-trend">
    <div className="admin-trend-toggles">{Array.from({ length: series }, (_, index) => <Skeleton key={index} width={110} height={30} />)}</div>
    <div className="admin-trend-scroll"><svg viewBox="0 0 750 216" className="admin-trend-svg" aria-hidden="true">
      {[20, 100, 180].map((y) => <line key={y} x1="80" x2="720" y1={y} y2={y} className="manager-chart-gridline" />)}
      <polyline points="80,150 170,125 260,140 350,75 440,95 530,50 620,70 720,25" fill="none" stroke="var(--color-border)" strokeWidth="8" strokeLinejoin="round" />
    </svg></div><div className="admin-chart-data"><SkeletonCopy>View chart data</SkeletonCopy></div>
  </div>;
}

export function AdminDashboardSkeleton({ slot = "all" }) {
  const panel = (title, note, children) => <Panel title={<SkeletonCopy>{title}</SkeletonCopy>} note={<SkeletonCopy>{note}</SkeletonCopy>}>{children}</Panel>;
  const totals = (count) => <div className="admin-inline-totals"><SkeletonPairs count={count} /></div>;
  return <div className="admin-dashboard-skeleton">
    {slot !== "bottom" && <>
      <div className="admin-section-heading"><h3><SkeletonCopy>Platform accounts</SkeletonCopy></h3><SkeletonCopy>Current · all time</SkeletonCopy></div>
      <div className="admin-kpi-grid admin-account-kpis">{[
        ["Registered restaurants", "All restaurant records"], ["Active restaurants", "Approved for the platform"], ["Pending approvals", "Restaurants awaiting review"], ["Registered customers", "Customer accounts"], ["Restaurant managers", "Manager accounts"],
      ].map(([title, detail]) => <Metric key={title} title={title} detail={detail} loading />)}</div>
      <div className="admin-section-heading"><h3><SkeletonCopy>Performance in this period</SkeletonCopy></h3><SkeletonCopy>Selected date range</SkeletonCopy></div>
      <div className="admin-kpi-grid admin-period-kpis">{[
        ["Reservations", "Scheduled visit dates"], ["Total orders", "Created in this period"], ["Completed orders", "Current completed status"], ["Gross transaction value", "Recorded customer purchases"], ["Commission earned", "Generated less reversals"], ["Outstanding commission", "Balance at period end · includes earlier dues"],
      ].map(([title, detail]) => <Metric key={title} title={title} detail={detail} loading />)}</div>
      <div className="admin-analytics-grid">
        {panel("Transactions & refunds", "Confirmed payment events · includes direct restaurant collections", <><TrendSkeleton />{totals(3)}</>)}
        {panel("Platform commission", "Earned and collected separately · internal wallet settlements", <><TrendSkeleton series={3} />{totals(6)}</>)}
        {panel("Orders", "Creation-date cohort · current fulfillment status", <>{totals(6)}<SkeletonBars series={3} /><SkeletonDonut detailed /></>)}
        {panel("Reservations", "Scheduled-date cohort · current reservation status", <>{totals(5)}<SkeletonBars series={3} /><SkeletonDonut detailed /></>)}
      </div>
    </>}
    {slot !== "top" && <>
      <div className="admin-analytics-grid">
        {panel("Customer growth", "Registered customers · registration dates in the selected period", <>{totals(4)}<TrendSkeleton series={1} /><p className="admin-analytics-note"><SkeletonCopy>Customer activity in the selected period</SkeletonCopy></p></>)}
        {panel("Payments overview", "Confirmed captures by event date · pending / failed by source creation date", <><div className="admin-payment-channels">{Array.from({ length: 3 }, (_, index) => <div key={index}><span><SkeletonCopy>Confirmed payment channel</SkeletonCopy><small><SkeletonCopy>Recorded payments</SkeletonCopy></small></span><Skeleton width={65} height={18} /></div>)}</div>{totals(4)}<p className="admin-analytics-note"><SkeletonCopy>Direct collections stay with restaurants.</SkeletonCopy></p></>)}
      </div>
      {panel("Wallet balances & settlement", "Current ledger balances · all time · separate from sales and bank receipts", <><div className="admin-wallet-grid">{Array.from({ length: 4 }, (_, index) => <div key={index}><SkeletonCopy>Account wallets</SkeletonCopy><Skeleton height={26} width="70%" /><small><SkeletonCopy>Accounts · net balance</SkeletonCopy></small><small><SkeletonCopy>Positive balances</SkeletonCopy></small></div>)}</div>{totals(4)}<p className="admin-analytics-note"><SkeletonCopy>Wallet balance and settlement information</SkeletonCopy></p></>)}
    </>}
  </div>;
}

function SkeletonPagination() {
  return <div className="admin-analytics-pagination"><Skeleton width={125} height={14} /><div><Skeleton width={75} height={38} /><Skeleton width={60} height={38} /></div></div>;
}
function RestaurantSkeleton() {
  return <>
    <div className="admin-restaurant-comparison"><div><SkeletonCopy>Compare this ranking by</SkeletonCopy><Skeleton height={38} /></div><div className="admin-restaurant-bars">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton height={12} /><Skeleton height={6} /><Skeleton height={12} /></div>)}</div></div>
    <div className="admin-table-scroll"><table><caption><SkeletonCopy>Restaurant performance in the selected period</SkeletonCopy></caption><thead><SkeletonRows rows={1} columns={9} /></thead><tbody><SkeletonRows rows={5} columns={9} /></tbody></table></div>
    <SkeletonPagination />
  </>;
}
function ActivitySkeleton() {
  return <><ol className="admin-real-activity">{Array.from({ length: 4 }, (_, index) => <li key={index}><Skeleton className="admin-event-icon" /><div><small><SkeletonCopy>Activity type</SkeletonCopy></small><strong><SkeletonCopy>Recorded platform event</SkeletonCopy></strong><span><SkeletonCopy>Related account or restaurant</SkeletonCopy></span></div><Skeleton width={105} height={14} /></li>)}</ol><SkeletonPagination /></>;
}

export function AdminDashboardContent({ data, slot = "all" }) {
  const { kpis, revenue, orders, reservations, customers, payments, period } = data;
  const summary = revenue.summary;
  return <>
    {slot !== "bottom" && <>
      <div className="admin-section-heading"><h3>Platform accounts</h3><span>Current · all time</span></div>
      <div className="admin-kpi-grid admin-account-kpis">
        <Metric title="Registered restaurants" value={kpis.restaurants} icon={Store} detail="All restaurant records" />
        <Metric title="Active restaurants" value={kpis.active_restaurants} icon={CheckCheck} detail="Approved for the platform" />
        <Metric title="Pending approvals" value={kpis.pending_approvals} icon={Clock3} detail="Restaurants awaiting review" />
        <Metric title="Registered customers" value={kpis.customers} icon={Users} detail="Customer accounts" />
        <Metric title="Restaurant managers" value={kpis.managers} icon={Users} detail="Manager accounts" />
      </div>
      <div className="admin-section-heading"><h3>Performance in this period</h3><span>{formatDate(period.start_date)} – {formatDate(period.end_date)}</span></div>
      <div className="admin-kpi-grid admin-period-kpis">
        <Metric title="Reservations" value={kpis.reservations} icon={CalendarDays} detail="Scheduled visit dates" />
        <Metric title="Total orders" value={kpis.orders} icon={ShoppingBasket} detail="Created in this period" />
        <Metric title="Completed orders" value={kpis.completed_orders} icon={CheckCheck} detail="Current completed status" />
        <Metric title="Gross transaction value" value={kpis.gross} currency icon={CreditCard} detail="Recorded customer purchases" />
        <Metric title="Commission earned" value={kpis.earned_commission} currency icon={CircleDollarSign} detail="Generated less reversals" />
        <Metric title="Outstanding commission" value={kpis.outstanding_commission} currency icon={Wallet} detail="Balance at period end · includes earlier dues" />
      </div>
      <div className="admin-analytics-grid">
        <Panel title="Transactions & refunds" note="Confirmed payment events · includes direct restaurant collections">
          <AdminTrendChart points={revenue.trend} series={grossSeries} group={period.group_by} label="Gross transactions and refunds" currency />
          <Totals items={[["Gross transaction value", money(summary.gross)], ["Refunds recorded", money(summary.refunds)], ["After refunds", money(summary.net_transaction_value)]]} />
        </Panel>
        <Panel title="Platform commission" note="Earned and collected separately · internal wallet settlements">
          <AdminTrendChart points={revenue.trend} series={commissionSeries} group={period.group_by} label="Commission generated, collected and outstanding" currency />
          <Totals items={[["Generated", money(summary.generated)], ["Commission reversed", money(summary.reversed)], ["Earned after reversals", money(summary.earned)], ["Collected, net", money(summary.collected_net)], ["Outstanding at period start", money(summary.outstanding_start)], ["Outstanding at period end", money(summary.outstanding_end)]]} />
        </Panel>
        <Panel title="Orders" note="Creation-date cohort · current fulfillment status">
          <Totals items={[["Total", number(orders.total)], ["Placed / accepted", number(orders.pending)], ["Preparing", number(orders.preparing)], ["Completed", number(orders.completed)], ["Cancelled / rejected", number(orders.cancelled)], ["Refunded", number(orders.refunded)]]} />
          <BarChart points={orders.trend} series={volumeSeries} group={period.group_by} label="Order volume trend" />
          <DonutChart items={distribution(orders.statuses)} label="Order statuses" detailed />
        </Panel>
        <Panel title="Reservations" note="Scheduled-date cohort · current reservation status">
          <Totals items={[["Total", number(reservations.total)], ["Upcoming", number(reservations.upcoming)], ["Completed", number(reservations.completed)], ["Cancelled / rejected", number(reservations.cancelled)], ["No show", number(reservations.no_show)]]} />
          <BarChart points={reservations.trend} series={volumeSeries.map((s) => s.key === "cancelled" ? { ...s, name: "Cancelled / rejected / no show" } : s)} group={period.group_by} label="Reservation volume trend" />
          <DonutChart items={distribution(reservations.statuses)} label="Reservation statuses" detailed />
        </Panel>
      </div>
    </>}
    {slot !== "top" && <>
      <div className="admin-analytics-grid">
        <Panel title="Customer growth" note="Registered customers · registration dates in the selected period">
          <Totals items={[["Customers · all time", number(customers.total)], ["New in period", number(customers.new)], ["Active in period", number(customers.active)], ["Repeat customers", number(customers.repeat)]]} />
          <AdminTrendChart points={customers.trend} series={[{ key: "new", name: "New customers", color: "#2e79bd" }]} group={period.group_by} label="Customer registration trend" />
          <p className="admin-analytics-note">{customers.activity_definition}</p>
        </Panel>
        <Panel title="Payments overview" note="Confirmed captures by event date · pending / failed by source creation date">
          <div className="admin-payment-channels">{payments.channels.length ? payments.channels.map((channel) => <div key={channel.method}><span>{channel.method === "PAY_AT_DESK" ? "Confirmed pay at restaurant" : channel.method === "WALLET" ? "Successful wallet payments" : channel.method === "RAZORPAY" ? "Verified Razorpay payments" : "Unclassified recorded payments"}<small>{number(channel.count)} payment{channel.count !== 1 ? "s" : ""}</small></span><strong>{money(channel.amount)}</strong></div>) : <p className="admin-analytics-empty">No confirmed payment records in this period.</p>}</div>
          <Totals items={[["Pending payments", `${number(payments.pending.count)} · ${money(payments.pending.amount)}`], ["Failed payments", `${number(payments.failed.count)} · ${money(payments.failed.amount)}`], ["Refunded payments", money(payments.refunded)], ["Commission settlements, net", money(payments.commission_settlements)]]} />
          <p className="admin-analytics-note">Direct collections stay with restaurants. A digital capture confirms payment; it does not confirm bank settlement.</p>
          {payments.unledgered_paid.count > 0 && <p className="admin-analytics-caution">{number(payments.unledgered_paid.count)} paid/refunded source records ({money(payments.unledgered_paid.amount)}) have no commission ledger snapshot. They are excluded from transaction and commission totals pending reconciliation.</p>}
        </Panel>
      </div>
      <Panel title="Wallet balances & settlement" note="Current ledger balances · all time · separate from sales and bank receipts" className="admin-wallet-panel" action={<Link to="/admin/revenue">Revenue & wallet</Link>}>
        <div className="admin-wallet-grid">{["MANAGER", "CUSTOMER", "CHEF", "ADMIN"].map((role) => {
          const wallet = payments.wallets.find((w) => w.role === role);
          return <div key={role}><span>{statusLabel(role)} wallets</span><strong>{money(wallet?.balance || 0)}</strong><small>{number(wallet?.accounts || 0)} accounts · net balance</small><small>Positive balances {money(wallet?.positive_balances || 0)}</small>{Number(wallet?.negative_balances || 0) < 0 && <small>Negative balances {money(wallet.negative_balances)}</small>}</div>;
        })}</div>
        <Totals items={[["Commission receivable · period end", money(payments.commission_receivables)], ["Wallet commission credits", money(summary.collected)], ["Wallet collection reversals", money(summary.collection_reversals)], ["Bank settlement", "Unavailable"]]} />
        <p className="admin-analytics-note">{payments.bank_settlement_note} Positive wallet balances are potential internal wallet obligations; bank backing cannot be verified from these records.</p>
      </Panel>
    </>}
  </>;
}

function RestaurantSection({ params, refreshTick }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("gross");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [chartBy, setChartBy] = useState("gross");
  const resource = useAdminDashboard("restaurants", { ...params, q, sort, direction, page, page_size: 10 });
  useEffect(() => { if (refreshTick) resource.refresh(); }, [refreshTick]);
  return <Panel title="Restaurant performance" note="Orders by creation · reservations by visit date · outstanding includes earlier dues">
    <form className="admin-restaurant-controls" onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
      <label>Restaurant or manager<input type="search" maxLength={120} placeholder="Search restaurants" value={search} onChange={(e) => setSearch(e.target.value)} /></label><button type="submit">Search</button>
      <label>Sort by<select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>{[["gross", "Transaction value"], ["orders", "Orders"], ["completed", "Completed orders"], ["reservations", "Reservations"], ["commission", "Commission"], ["outstanding", "Outstanding"], ["name", "Name"]].map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label>Direction<select value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
    </form>
    <AdminDashboardFeedback {...resource} section="restaurants" />
    {resource.data && <RestaurantContent data={resource.data} pageChange={setPage} chartBy={chartBy} setChartBy={setChartBy} />}
  </Panel>;
}

export function RestaurantContent({ data, pageChange = () => {}, chartBy = "gross", setChartBy = () => {} }) {
  const max = Math.max(1, ...data.leaders.map((r) => Number(r[chartBy])));
  return <>
    {!!data.leaders.length && <div className="admin-restaurant-comparison"><label>Compare this ranking by<select value={chartBy} onChange={(e) => setChartBy(e.target.value)}><option value="gross">Gross transaction value</option><option value="orders">Orders</option><option value="reservations">Reservations</option></select></label>
      <div className="admin-restaurant-bars">{data.leaders.map((r) => <div key={r.id}><span>{r.name}</span><i><b style={{ width: `${Number(r[chartBy]) / max * 100}%` }} /></i><strong>{chartBy === "gross" ? money(r.gross) : number(r[chartBy])}</strong></div>)}</div>
    </div>}
    <div className="admin-table-scroll" role="region" aria-label="Restaurant performance table" tabIndex={0}><table><caption>Restaurant performance in the selected period</caption><thead><tr>{["Restaurant", "Manager", "Orders", "Completed", "Reservations", "Gross value", "Commission earned", "Outstanding at period end", "Status"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{data.items.map((r) => <tr key={r.id}><th scope="row"><Link to={`/admin/restaurants/${r.id}`}>{r.name}</Link></th><td>{r.manager_name}</td><td>{number(r.orders)}</td><td>{number(r.completed)}</td><td>{number(r.reservations)}</td><td>{money(r.gross)}</td><td>{money(r.commission)}</td><td>{money(r.outstanding)}</td><td><span className="admin-restaurant-status">{statusLabel(r.status)}</span></td></tr>)}</tbody></table></div>
    {!data.items.length && <p className="admin-analytics-empty">{data.total ? "No restaurants on this page. Return to the previous page." : "No restaurants match these filters."}</p>}
    <Pagination {...data} onPage={pageChange} />
  </>;
}

function ActivitySection({ params, refreshTick }) {
  const [page, setPage] = useState(1);
  const resource = useAdminDashboard("activity", { ...params, page, page_size: 8 });
  useEffect(() => { if (refreshTick) resource.refresh(); }, [refreshTick]);
  return <Panel title="Recent platform activity" note="Recorded events in the selected period · newest first"><AdminDashboardFeedback {...resource} section="activity" />{resource.data && <ActivityContent data={resource.data} pageChange={setPage} />}</Panel>;
}
export function ActivityContent({ data, pageChange = () => {} }) {
  return <>{data.items.length ? <ol className="admin-real-activity">{data.items.map((item) => <li key={item.id}><span className="admin-event-icon"><Activity size={16} aria-hidden="true" /></span><div><small>{statusLabel(item.event_type)}</small><strong>{item.title}</strong>{item.subject && <span>{item.subject}</span>}</div><time dateTime={item.occurred_at}>{formatInstant(item.occurred_at)}</time></li>)}</ol> : <p className="admin-analytics-empty">No recorded platform events in this period.</p>}<Pagination {...data} onPage={pageChange} /></>;
}
function Pagination({ page, page_size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / page_size));
  return <div className="admin-analytics-pagination"><span>{number(total)} records · Page {page} of {pages}</span><div><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div></div>;
}
