import LoadingState, {
  ErrorState,
  RefreshIndicator,
} from "../../components/ui/LoadingState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import {
  SkeletonBars,
  SkeletonCopy,
  SkeletonDonut,
  SkeletonManagerList,
  SkeletonPairs,
} from "../../components/ui/DashboardSkeleton.jsx";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CircleDollarSign,
  Plus,
  RefreshCw,
  ShoppingBasket,
  Star,
  Table2,
  Tag,
  Users,
  Receipt,
} from "lucide-react";
import { usePageState } from "../../state/usePageState.js";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ManagerLedgerDownloads from "../../components/manager/ManagerLedgerDownloads.jsx";
import {
  BarChart,
  DonutChart,
  EmptyState,
} from "../../components/manager/DashboardCharts.jsx";
import useManagerDashboard from "../../hooks/useManagerDashboard.js";
import { formatWallTime } from "../../lib/localDate.js";
import {
  comparison,
  formatCurrency,
  formatDate,
  formatInstant,
  formatNumber,
  MANAGER_PERIOD_PRESETS,
  presetPeriod,
  STATUS_COLORS,
  statusLabel,
  validatePeriod,
} from "../../lib/managerDashboard.js";
import "../../assets/css/ManagerDashboardPage.css";

const revenueSeries = [
  { key: "revenue", name: "Collected less refunds", color: "#7c2d3c" },
  { key: "net", name: "After commission", color: "#2675c9" },
];
const orderSeries = [
  { key: "completed", name: "Completed", color: "#2d8737" },
  { key: "pending", name: "Active / pending", color: "#ef7917" },
  { key: "cancelled", name: "Cancelled / rejected", color: "#c44758" },
];
const visitSeries = [
  { key: "completed", name: "Completed", color: "#2d8737" },
  { key: "pending", name: "Pending / confirmed / seated", color: "#2675c9" },
  {
    key: "cancelled",
    name: "Cancelled / rejected / no-show",
    color: "#c44758",
  },
];
const customerSeries = [
  { key: "new", name: "New in interval", color: "#7c2d3c" },
  { key: "returning", name: "Returning in interval", color: "#2675c9" },
];
const distribution = (items) =>
  items.map(({ status, count }) => ({
    label: statusLabel(status),
    value: count,
    color: STATUS_COLORS[status],
  }));

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [filters, set] = usePageState("ManagerDashboardFilters", () => {
    const period = presetPeriod("last30");
    return {
      preset: "last30",
      period,
      draft: period,
      group: "auto",
      sort: "quantity",
      filterError: "",
    };
  });
  const params = useMemo(
    () => ({
      ...filters.period,
      group_by: filters.group,
      popular_sort: filters.sort,
    }),
    [filters.period, filters.group, filters.sort],
  );
  const validation = validatePeriod(
    params.start_date,
    params.end_date,
    params.group_by,
  );
  const { data, loading, error, refresh } = useManagerDashboard(
    params,
    !validation,
  );
  const unappliedDates =
    filters.preset === "custom" &&
    (filters.draft.start_date !== filters.period.start_date ||
      filters.draft.end_date !== filters.period.end_date);

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
    const message = validatePeriod(
      filters.draft.start_date,
      filters.draft.end_date,
      filters.group,
    );
    set.filterError(message);
    if (!message) set.period({ ...filters.draft });
  }

  return (
    <ManagerLayout title="Dashboard">
      <div className="manager-dashboard-content manager-analytics">
        <div className="manager-heading">
          <div>
            <h2>Welcome{data?.manager_name ? `, ${data.manager_name}` : ""}</h2>
            <p>
              {data?.restaurant_name || "Your restaurant"} · Operations and
              performance
            </p>
          </div>
        </div>
        <div className="manager-quick-actions">
          {[
            {
              icon: Plus,
              title: "Add a menu item",
              detail: "Add a dish guests can order",
              path: "/manager/menu",
            },
            {
              icon: Tag,
              title: "Create an offer",
              detail: "Share a deal with guests",
              path: "/manager/offers",
            },
            {
              icon: Table2,
              title: "Set up tables",
              detail: "Arrange floors and seating",
              path: "/manager/tables",
            },
            {
              icon: CalendarDays,
              title: "View reservations",
              detail: "See upcoming guest bookings",
              path: "/manager/reservations",
            },
          ].map(({ icon: Icon, title, detail, path }) => (
            <button type="button" key={title} onClick={() => navigate(path)}>
              <span className="manager-action-icon">
                <Icon size={17} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="manager-dashboard-filters">
          <label>
            Period
            <select
              value={filters.preset}
              onChange={(event) => selectPreset(event.target.value)}
            >
              {MANAGER_PERIOD_PRESETS.map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chart interval
            <select
              value={filters.group}
              onChange={(event) => set.group(event.target.value)}
            >
              {[
                ["auto", "Automatic"],
                ["day", "Daily"],
                ["week", "Weekly"],
                ["month", "Monthly"],
                ["year", "Yearly"],
              ].map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="manager-dashboard-refresh"
            onClick={refresh}
            disabled={loading || !!validation}
          >
            <RefreshCw
              size={16}
              className={loading ? "manager-refresh-spinning" : ""}
            />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <ManagerLedgerDownloads
            key={`${filters.period.start_date}:${filters.period.end_date}`}
            period={filters.period}
            disabled={Boolean(validation) || unappliedDates}
          />
          {filters.preset === "custom" && (
            <form
              onSubmit={applyCustom}
              className="manager-dashboard-date-range"
            >
              <label>
                Start date
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  required
                  value={filters.draft.start_date}
                  onChange={(event) =>
                    set.draft((current) => ({
                      ...current,
                      start_date: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  min="2000-01-01"
                  max="2099-12-31"
                  required
                  value={filters.draft.end_date}
                  onChange={(event) =>
                    set.draft((current) => ({
                      ...current,
                      end_date: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit">Apply range</button>
            </form>
          )}
        </div>
        {(validation || filters.filterError) && (
          <p role="alert" className="manager-dashboard-error">
            {validation || filters.filterError}
          </p>
        )}
        <DashboardFeedback
          error={error}
          loading={loading}
          hasData={Boolean(data)}
          validation={validation}
          refresh={refresh}
        />
        {data && !validation && (
          <DashboardContent
            data={data}
            sort={filters.sort}
            setSort={set.sort}
            navigate={navigate}
          />
        )}
      </div>
    </ManagerLayout>
  );
}

export function DashboardFeedback({
  error,
  loading,
  hasData,
  validation,
  refresh,
}) {
  if (validation) return null;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (loading && !hasData)
    return (
      <LoadingState label="Loading restaurant performance…">
        <DashboardSkeleton />
      </LoadingState>
    );
  return <RefreshIndicator active={loading && hasData} />;
}

function useDashboardPanels() {
  const panelsRef = useRef(null);
  // Pack natural card heights into one-pixel rows, leaving 16px between cards.
  useEffect(() => {
    const container = panelsRef.current;
    const panels = [...container.querySelectorAll(".manager-panel")];
    const sizeCard = (panel) => {
      const span = `span ${Math.ceil(panel.getBoundingClientRect().height) + 16}`;
      if (panel.style.gridRowEnd !== span) panel.style.gridRowEnd = span;
    };
    const observer = new ResizeObserver((entries) =>
      entries.forEach(({ target }) => sizeCard(target)),
    );
    panels.forEach((panel) => {
      sizeCard(panel);
      observer.observe(panel);
    });
    container.dataset.measured = "true";
    return () => observer.disconnect();
  }, []);
  return panelsRef;
}

export function DashboardSkeleton() {
  const panelsRef = useDashboardPanels();
  const panel = (title, subtitle, children, action) => (
    <Panel
      title={<SkeletonCopy>{title}</SkeletonCopy>}
      subtitle={<SkeletonCopy>{subtitle}</SkeletonCopy>}
      action={action && <Skeleton width={110} height={38} />}
    >
      {children}
    </Panel>
  );
  return (
    <div className="manager-dashboard-skeleton">
      <p className="manager-dashboard-period">
        <SkeletonCopy>1 Nov 2026 – 30 Nov 2026 · Asia/Kolkata</SkeletonCopy>
        <SkeletonCopy>
          Compared with the previous period. Charts grouped daily.
        </SkeletonCopy>
      </p>
      <div className="manager-summary-grid">
        {[
          ["Revenue after refunds", CircleDollarSign],
          ["Total Orders", ShoppingBasket],
          ["Reservations", CalendarDays],
          ["Unique Customers", Users],
          ["Average Order Value", Receipt],
          ["Table Occupancy · Live", Table2],
          ["Average Rating", Star],
        ].map(([title, icon], index) => (
          <SummaryCard
            key={title}
            title={title}
            icon={icon}
            loading
            comparison={index !== 5}
          />
        ))}
      </div>
      <div className="manager-dashboard-panels" ref={panelsRef}>
        {panel(
          "Revenue Overview",
          "INR · Collection and reversal dates",
          <>
            <SkeletonBars />
            <div className="manager-financial-totals">
              <SkeletonPairs />
            </div>
          </>,
        )}
        {panel(
          "Order Statuses",
          "Selected period · Order creation date",
          <SkeletonDonut detailed />,
        )}
        {panel(
          "Live Floor Status Summary",
          "Current · Updated just now",
          <>
            <div
              className="manager-table-grid"
              style={{
                "--table-columns": 5,
                "--table-columns-small": 2,
                "--table-columns-wide": 8,
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div className="manager-table-card" key={index}>
                  <strong>
                    <SkeletonCopy>Table 00</SkeletonCopy>
                  </strong>
                  <span>
                    <SkeletonCopy>Floor · 4 seats</SkeletonCopy>
                  </span>
                  <small>
                    <SkeletonCopy>Available</SkeletonCopy>
                  </small>
                </div>
              ))}
            </div>
            <p className="manager-panel-note">
              <SkeletonCopy>
                Active tables · reserved · in maintenance
              </SkeletonCopy>
            </p>
          </>,
          true,
        )}
        {panel(
          "Popular Items",
          "Paid orders · Sales after discounts, before tax",
          <div className="manager-popular-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="manager-popular-item manager-popular-chart-item"
                key={index}
              >
                <div>
                  <strong>
                    <SkeletonCopy>Popular menu item</SkeletonCopy>
                  </strong>
                  <span>
                    <SkeletonCopy>Quantity sold · Revenue</SkeletonCopy>
                  </span>
                  <Skeleton className="manager-popular-track" height={6} />
                </div>
              </div>
            ))}
          </div>,
          true,
        )}
        {panel(
          "Order Trends",
          "Completed orders · Order creation dates",
          <>
            <SkeletonBars series={3} />
            <p className="manager-panel-note">
              <SkeletonCopy>Peak order hours</SkeletonCopy>
            </p>
          </>,
        )}
        {panel(
          "Reservation Trends",
          "Completed reservations · Scheduled arrival dates",
          <>
            <SkeletonBars series={3} />
            <p className="manager-panel-note">
              <SkeletonCopy>Peak arrival hours</SkeletonCopy>
              <SkeletonCopy>Peak booking days</SkeletonCopy>
            </p>
          </>,
        )}
        {panel(
          "Customer Growth",
          "Returning in period · Known customer accounts",
          <>
            <SkeletonBars />
            <p className="manager-panel-note">
              <SkeletonCopy>
                New customers are identified from their full restaurant history.
              </SkeletonCopy>
            </p>
          </>,
        )}
        {panel(
          "Reservation Statuses",
          "Expected guests · Average party size",
          <SkeletonDonut detailed />,
        )}
        {panel(
          "Payment Methods",
          "Captured volume · Before refunds",
          <SkeletonDonut />,
        )}
        {panel(
          "Reviews and Ratings",
          "Published reviews in selected period",
          <>
            <div className="manager-rating-summary">
              <Skeleton width={60} height={48} />
              <div className="manager-rating-breakdown">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} height={15} />
                ))}
              </div>
            </div>
            <SkeletonManagerList rows={2} />
          </>,
          true,
        )}
        {panel(
          "Upcoming Reservations",
          "Live · Next scheduled arrivals",
          <SkeletonManagerList />,
          true,
        )}
        {panel(
          "Recent Active Orders",
          "Live · Most recently placed",
          <SkeletonManagerList />,
          true,
        )}
      </div>
      <div className="manager-dashboard-methodology">
        <SkeletonCopy>How these numbers are calculated</SkeletonCopy>
      </div>
    </div>
  );
}

export function DashboardContent({ data, sort, setSort, navigate }) {
  const { overview, operations, period, live, revenue, reviews, customers } =
    data;
  const count = (statuses, status) =>
    statuses.find((item) => item.status === status)?.count || 0;
  const panelsRef = useDashboardPanels();
  const tableColumns = (limit) =>
    live.table_preview.length
      ? Math.ceil(
          live.table_preview.length /
            Math.ceil(live.table_preview.length / limit),
        )
      : 1;
  return (
    <>
      <p className="manager-dashboard-period">
        {formatDate(period.start_date)} – {formatDate(period.end_date)} ·{" "}
        {period.timezone}
        <br />
        Compared with {formatDate(period.previous_start_date)} –{" "}
        {formatDate(period.previous_end_date)}. Charts grouped{" "}
        {statusLabel(period.group_by)}.
      </p>
      <div className="manager-summary-grid">
        <SummaryCard
          title="Revenue after refunds"
          metric={overview.revenue}
          currency
          detail={`${formatCurrency(revenue.gross)} collected`}
          icon={CircleDollarSign}
        />
        <SummaryCard
          title="Total Orders"
          metric={overview.orders}
          detail={`${count(operations.order_status, "COMPLETED")} completed · ${formatNumber(Number(overview.orders.value) - count(operations.order_status, "COMPLETED") - count(operations.order_status, "CANCELLED") - count(operations.order_status, "REJECTED"))} active`}
          icon={ShoppingBasket}
        />
        <SummaryCard
          title="Reservations"
          metric={overview.reservations}
          detail={`${count(operations.reservation_status, "CONFIRMED")} confirmed · ${operations.expected_guests} expected guests`}
          icon={CalendarDays}
        />
        <SummaryCard
          title="Unique Customers"
          metric={overview.customers}
          detail={`${customers.new} new · ${customers.returning} returning`}
          icon={Users}
        />
        <SummaryCard
          title="Average Order Value"
          metric={overview.average_order_value}
          currency
          detail="Paid, non-cancelled orders"
          icon={Receipt}
        />
        <SummaryCard
          title="Table Occupancy · Live"
          value={`${live.tables.occupied} / ${live.tables.total}`}
          detail={`${live.tables.occupancy_percent}% occupied · ${live.tables.available} available`}
          icon={Table2}
        />
        <SummaryCard
          title="Average Rating"
          metric={reviews.total ? overview.rating : undefined}
          value={reviews.total ? `${formatNumber(reviews.average)} ★` : "—"}
          detail={`${reviews.total} published reviews in period`}
          icon={Star}
        />
      </div>

      <div className="manager-dashboard-panels" ref={panelsRef}>
        <div className="manager-dashboard-grid">
          <Panel
            title="Revenue Overview"
            subtitle="INR · Collection and reversal dates"
          >
            <BarChart
              points={data.revenue_chart}
              series={revenueSeries}
              group={period.group_by}
              currency
              label="Revenue over time in INR"
            />
            <div className="manager-financial-totals">
              {[
                ["Gross collected", revenue.gross],
                ["Refunds", revenue.refunds],
                ["Commission, after reversals", revenue.commissions],
                ["Net after commission", revenue.net],
              ].map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{formatCurrency(value)}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Order Statuses"
            subtitle="Selected period · Order creation date"
          >
            <DonutChart
              items={distribution(operations.order_status)}
              label="Orders"
              detailed
            />
          </Panel>
        </div>

        <div className="manager-dashboard-grid manager-middle-grid">
          <Panel
            title="Live Floor Status Summary"
            subtitle={`Current · Updated ${formatInstant(live.as_of)}`}
            action={
              <button type="button" onClick={() => navigate("/manager/tables")}>
                View all tables
              </button>
            }
          >
            {live.table_preview.length ? (
              <div
                className="manager-table-grid"
                style={{
                  "--table-columns": tableColumns(5),
                  "--table-columns-small": tableColumns(2),
                  "--table-columns-wide": tableColumns(8),
                }}
              >
                {live.table_preview.map((table) => (
                  <div
                    className={`manager-table-card ${table.status}`}
                    key={table.id}
                  >
                    <strong>Table {table.name}</strong>
                    <span>
                      {table.floor} · {table.seats} seats
                    </span>
                    <small>{statusLabel(table.status)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>
                No active tables. Set up floors and tables to view seating.
              </EmptyState>
            )}
            <p className="manager-panel-note">
              {live.tables.total} active tables · {live.tables.reserved}{" "}
              reserved · {live.tables.maintenance} in maintenance. Showing up to
              20 tables.
            </p>
          </Panel>
          <Panel
            title="Popular Items"
            subtitle="Paid orders · Sales after discounts, before tax"
            action={
              <label className="manager-dashboard-sort">
                Rank by
                <select
                  aria-label="Rank popular items by"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="quantity">Most sold</option>
                  <option value="revenue">Highest revenue</option>
                </select>
              </label>
            }
          >
            {data.popular_items.length ? (
              <div
                className="manager-popular-list"
                tabIndex={0}
                role="region"
                aria-label="Popular menu items"
              >
                {data.popular_items.map((item, index) => (
                  <div
                    key={item.key}
                    className="manager-popular-item manager-popular-chart-item"
                  >
                    <div>
                      <strong title={item.name}>
                        {index + 1}. {item.name}
                      </strong>
                      <span>
                        {formatNumber(item.quantity)} sold ·{" "}
                        {formatCurrency(item.revenue)}
                      </span>
                      <div
                        className="manager-popular-track"
                        title={`${item.name}: ${item.quantity} sold, ${formatCurrency(item.revenue)}`}
                      >
                        <i
                          style={{
                            width: `${(Number(sort === "revenue" ? item.revenue : item.quantity) / Math.max(1, ...data.popular_items.map((row) => Number(sort === "revenue" ? row.revenue : row.quantity)))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No qualifying paid items in this period.</EmptyState>
            )}
          </Panel>
        </div>

        <div className="manager-bottom-grid">
          <Panel
            title="Order Trends"
            subtitle={`${operations.order_completion_percent}% completed · Order creation dates`}
          >
            <BarChart
              points={operations.order_trend}
              series={orderSeries}
              group={period.group_by}
              label="Orders over time"
            />
            <PeakSummary
              title="Peak order hours"
              items={operations.peak_order_hours}
              hours
            />
          </Panel>
          <Panel
            title="Reservation Trends"
            subtitle={`${operations.reservation_completion_percent}% completed · Scheduled arrival dates`}
          >
            <BarChart
              points={operations.reservation_trend}
              series={visitSeries}
              group={period.group_by}
              label="Reservations over time"
            />
            <PeakSummary
              title="Peak arrival hours"
              items={operations.peak_reservation_hours}
              hours
            />
            <PeakSummary
              title="Peak booking days"
              items={operations.peak_reservation_days}
            />
          </Panel>
        </div>
        <div className="manager-dashboard-grid">
          <Panel
            title="Customer Growth"
            subtitle={`${customers.retention_percent}% returning in period · Known customer accounts`}
          >
            <BarChart
              points={customers.trend}
              series={customerSeries}
              group={period.group_by}
              label="Unique restaurant customers over time"
            />
            <p className="manager-panel-note">
              New customers are identified from their full restaurant history. A
              customer can appear in more than one chart interval.
            </p>
          </Panel>
          <Panel
            title="Reservation Statuses"
            subtitle={`${operations.expected_guests} expected guests · Average party ${formatNumber(operations.average_party_size)}`}
          >
            <DonutChart
              items={distribution(operations.reservation_status)}
              label="Reservations"
              detailed
            />
          </Panel>
        </div>
        <div className="manager-bottom-grid">
          <Panel
            title="Payment Methods"
            subtitle="Captured volume · Before refunds"
          >
            <DonutChart
              items={data.payment_methods.map((item) => ({
                label: `${statusLabel(item.method)} · ${item.count} payments`,
                value: item.amount,
              }))}
              label="Collected payments"
              currency
              detailed
            />
          </Panel>
          <Panel
            title="Reviews and Ratings"
            subtitle="Published reviews in selected period"
            action={
              <button
                type="button"
                onClick={() => navigate("/manager/reviews")}
              >
                View reviews
              </button>
            }
          >
            {reviews.total ? (
              <div className="manager-rating-summary">
                <div className="manager-rating-average">
                  <strong>
                    {formatNumber(reviews.average)}{" "}
                    <span aria-hidden="true">★</span>
                  </strong>
                  <span>
                    {reviews.total} {reviews.total === 1 ? "review" : "reviews"}
                  </span>
                </div>
                <div
                  className="manager-rating-breakdown"
                  role="group"
                  aria-label="Published rating distribution"
                >
                  {[...reviews.distribution].reverse().map((item) => (
                    <div
                      className="manager-rating-row"
                      key={item.status}
                      role="img"
                      aria-label={`${item.status} stars: ${item.count} ${item.count === 1 ? "review" : "reviews"}`}
                    >
                      <span aria-hidden="true">{item.status} ★</span>
                      <span className="manager-rating-track" aria-hidden="true">
                        <i
                          style={{
                            width: `${(item.count / reviews.total) * 100}%`,
                          }}
                        />
                      </span>
                      <b aria-hidden="true">{item.count}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState>No published reviews in this period.</EmptyState>
            )}
            {!!reviews.recent.length && (
              <div
                className="manager-list manager-review-list"
                tabIndex={0}
                role="region"
                aria-label="Recent published reviews"
              >
                {reviews.recent.map((review) => (
                  <div
                    key={review.id}
                    className="manager-list-row manager-review-preview"
                  >
                    <div>
                      <strong>
                        {review.rating} ★ · {formatInstant(review.created_at)}
                      </strong>
                      <p>{review.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="manager-bottom-grid">
          <Panel
            title="Upcoming Reservations"
            subtitle="Live · Next scheduled arrivals"
            action={
              <button
                type="button"
                onClick={() => navigate("/manager/reservations")}
              >
                View all
              </button>
            }
          >
            {live.upcoming_reservations.length ? (
              <div className="manager-list">
                {live.upcoming_reservations.map((reservation) => (
                  <div className="manager-list-row" key={reservation.id}>
                    <div>
                      <strong>
                        RES-{reservation.id.slice(0, 8).toUpperCase()}
                      </strong>
                      <span>
                        {reservation.guests} guests ·{" "}
                        {statusLabel(reservation.status)}
                      </span>
                    </div>
                    <b>
                      {formatDate(reservation.date)}
                      <br />
                      {formatWallTime(reservation.time)} IST
                    </b>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No upcoming reservations.</EmptyState>
            )}
          </Panel>
          <Panel
            title="Recent Active Orders"
            subtitle="Live · Most recently placed"
            action={
              <button
                type="button"
                onClick={() => navigate("/manager/reservations")}
              >
                View reservations &amp; orders
              </button>
            }
          >
            {live.active_orders.length ? (
              <div className="manager-list">
                {live.active_orders.map((order) => (
                  <div className="manager-list-row" key={order.id}>
                    <div>
                      <button
                        type="button"
                        className="manager-order-link"
                        onClick={() => navigate(`/manager/orders/${order.id}`)}
                      >
                        DB-{order.id.slice(0, 8).toUpperCase()}
                      </button>
                      <span>{formatInstant(order.created_at)}</span>
                    </div>
                    <div className="manager-order-row-right">
                      <b>{formatCurrency(order.amount)}</b>
                      <span
                        className={`manager-order-pill ${order.status.toLowerCase()}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No active orders.</EmptyState>
            )}
          </Panel>
        </div>
      </div>
      <details className="manager-dashboard-methodology">
        <summary>How these numbers are calculated</summary>
        <ul>
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="manager-panel">
      <div className="manager-panel-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function PeakSummary({ title, items, hours = false }) {
  return (
    <p className="manager-panel-note">
      <strong>{title}: </strong>
      {items.length
        ? items
            .map(
              (item) =>
                `${hours ? `${item.label}:00` : item.label} (${formatNumber(item.count)})`,
            )
            .join(" · ")
        : "No qualifying activity"}
    </p>
  );
}
function SummaryCard({
  title,
  metric,
  value,
  currency = false,
  detail,
  icon: Icon,
  loading = false,
  comparison: showComparison = true,
}) {
  const formatted = loading ? (
    <Skeleton width="62%" height="1.25em" />
  ) : (
    (value ??
    (currency ? formatCurrency(metric.value) : formatNumber(metric.value)))
  );
  return (
    <article className="manager-summary-card">
      <div className="manager-summary-top">
        <span>{loading ? <SkeletonCopy>{title}</SkeletonCopy> : title}</span>
        <div className="manager-summary-icon">
          {loading ? <Skeleton width={16} height={16} /> : <Icon size={16} />}
        </div>
      </div>
      <strong className="manager-summary-value">{formatted}</strong>
      <div className="manager-summary-detail">
        {loading ? (
          <>
            {showComparison && (
              <b>
                <SkeletonCopy>0% vs previous</SkeletonCopy>
              </b>
            )}
            <span>
              <SkeletonCopy>Period summary</SkeletonCopy>
            </span>
          </>
        ) : (
          <>
            {metric && (
              <b
                className={
                  Number(metric.change_percent) < 0
                    ? "manager-change-negative"
                    : Number(metric.change_percent) > 0
                      ? ""
                      : "manager-change-neutral"
                }
                title={`Previous period: ${currency ? formatCurrency(metric.previous) : formatNumber(metric.previous)}`}
              >
                {comparison(metric)}
              </b>
            )}
            <span title={detail}>{detail}</span>
          </>
        )}
      </div>
    </article>
  );
}
