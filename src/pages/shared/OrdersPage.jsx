import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  Plus,
  Search,
  Users,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import Pagination from "../../components/Pagination.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import "./ManagerOrdersPage.css";

const managerOrderFilters = [
  "ALL",
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const transitions = {
  manager: { PLACED: ["ACCEPTED", "REJECTED"], READY: ["COMPLETED"] },
  chef: { ACCEPTED: ["PREPARING"], PREPARING: ["READY"] },
};
const statusLabel = (status) =>
  status
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const orderDateKey = (order) =>
  order.reservation?.reservation_date || dateKey(new Date(order.created_at));

export default function OrdersPage({ mode = "customer" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialParams = new URLSearchParams(location.search);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [search, setSearch] = useState(() => initialParams.get("search") || "");
  const [headerUser, setHeaderUser] = useState(null);
  const [managerStatusFilter, setManagerStatusFilter] = useState(
    () => initialParams.get("status") || "ALL",
  );
  const [statusFilter, setStatusFilter] = useState(
    mode === "chef" ? "ACTIVE" : "ALL",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState(mode === "chef" ? "oldest" : "newest");
  const [page, setPage] = useState(() =>
    Math.max(1, Number(initialParams.get("page") || 1)),
  );
  const [pageSize, setPageSize] = useState(() =>
    Math.max(1, Number(initialParams.get("pageSize") || 10)),
  );
  const [selectedOrderDate, setSelectedOrderDate] = useState(
    () => initialParams.get("date") || dateKey(new Date()),
  );
  const [orderMonth, setOrderMonth] = useState(() => {
    const value = initialParams.get("month");
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [year, month] = value.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const pageFilterKey = JSON.stringify([
    search,
    statusFilter,
    managerStatusFilter,
    selectedOrderDate,
    dateFrom,
    dateTo,
    sort,
    pageSize,
  ]);
  const previousPageFilterKey = useRef(pageFilterKey);
  const loadSequence = useRef(0);
  const endpoint = {
    customer: "/api/customer/orders",
    manager: "/api/manager/orders",
    chef: "/api/chef/orders",
    admin: "/api/admin/orders",
  }[mode];
  const matchingOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders
      .filter((order) => {
        const itemNames = (order.items || [])
          .map((item) => item.food_name)
          .join(" ");
        const haystack =
          `${order.id} ${order.restaurant_name || ""} ${order.customer_name || ""} ${order.customer_email || ""} ${itemNames} ${order.reservation?.tables?.map((table) => table.table_number).join(" ") || ""}`.toLowerCase();
        const created = new Date(order.created_at).toLocaleDateString("en-CA");
        const statusMatches =
          mode === "manager"
            ? managerStatusFilter === "ALL" ||
              order.status === managerStatusFilter
            : statusFilter === "ALL" ||
              (statusFilter === "ACTIVE"
                ? ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(
                    order.status,
                  )
                : order.status === statusFilter);
        const dateMatches =
          ((mode !== "manager" && mode !== "chef") ||
            orderDateKey(order) === selectedOrderDate) &&
          (!dateFrom || created >= dateFrom) &&
          (!dateTo || created <= dateTo);
        return (
          (!needle || haystack.includes(needle)) && statusMatches && dateMatches
        );
      })
      .sort((left, right) => {
        if (sort === "amount-low" || sort === "amount-high") {
          const delta = Number(left.total || 0) - Number(right.total || 0);
          return sort === "amount-low" ? delta : -delta;
        }
        const delta =
          Date.parse(left.created_at || 0) - Date.parse(right.created_at || 0);
        return sort === "oldest" ? delta : -delta;
      });
  }, [
    orders,
    search,
    statusFilter,
    managerStatusFilter,
    selectedOrderDate,
    mode,
    dateFrom,
    dateTo,
    sort,
  ]);
  const pageCount = Math.max(1, Math.ceil(matchingOrders.length / pageSize));
  const visibleOrders = matchingOrders.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => {
    if (previousPageFilterKey.current !== pageFilterKey) {
      previousPageFilterKey.current = pageFilterKey;
      setPage(1);
    }
  }, [pageFilterKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  useEffect(() => {
    if (mode !== "manager" || location.pathname !== "/manager/orders") return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (managerStatusFilter !== "ALL")
      params.set("status", managerStatusFilter);
    params.set("date", selectedOrderDate);
    params.set(
      "month",
      `${orderMonth.getFullYear()}-${String(orderMonth.getMonth() + 1).padStart(2, "0")}`,
    );
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const nextSearch = params.toString();
    if (location.search !== `?${nextSearch}`)
      navigate(`${location.pathname}?${nextSearch}`, { replace: true });
  }, [
    mode,
    location.pathname,
    location.search,
    navigate,
    search,
    managerStatusFilter,
    selectedOrderDate,
    orderMonth,
    page,
    pageSize,
  ]);
  const calendarDays = useMemo(() => {
    const first = new Date(orderMonth.getFullYear(), orderMonth.getMonth(), 1);
    const start = new Date(
      first.getFullYear(),
      first.getMonth(),
      1 - first.getDay(),
    );
    return Array.from(
      { length: 42 },
      (_, index) =>
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + index,
        ),
    );
  }, [orderMonth]);
  const calendarOrderCounts = useMemo(
    () =>
      orders.reduce((counts, order) => {
        const key = orderDateKey(order);
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      }, {}),
    [orders],
  );

  async function load() {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const orderData = await requestJson(
        mode === "admin" ? `${endpoint}?limit=500` : endpoint,
      );
      if (sequence === loadSequence.current) setOrders(orderData);
    } catch (reason) {
      if (sequence === loadSequence.current) setError(reason.message);
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }
  const realtimeStatus = useRealtimeEvents({
    enabled: mode !== "admin",
    onEvent: load,
    onReconnect: load,
  });
  useEffect(() => {
    load();
  }, [endpoint]);
  useEffect(() => {
    if (mode === "customer")
      requestJson("/api/customer/me")
        .then(setHeaderUser)
        .catch(() => setHeaderUser(null));
  }, [mode]);

  async function updateOrder(orderId, status, reason = "") {
    setBusy(orderId);
    setNotice("");
    try {
      const updated = await requestJson(`${endpoint}/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: reason.trim() || null }),
      });
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updated : order)),
      );
      return true;
    } catch (reason) {
      setNotice(reason.message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function cancelOrder(orderId, reason) {
    setBusy(orderId);
    try {
      const updated = await requestJson(`${endpoint}/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updated : order)),
      );
      return true;
    } catch (reason) {
      setNotice(reason.message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function confirmOrderAction(reason = "") {
    if (!pendingAction) return;
    const { order, status, kind } = pendingAction;
    const completed =
      kind === "cancel"
        ? await cancelOrder(order.id, reason)
        : await updateOrder(order.id, status, reason);
    if (completed) setPendingAction(null);
  }

  function requestOrderUpdate(orderId, status) {
    if (["CANCELLED", "REJECTED"].includes(status)) {
      const order = orders.find((item) => item.id === orderId);
      if (order) {
        setActionReason("");
        setPendingAction({ kind: "status", order, status });
      }
      return;
    }
    updateOrder(orderId, status);
  }

  function openManagerOrder(order) {
    const returnTo = `${location.pathname}${location.search}`;
    const target = `/manager/orders/${encodeURIComponent(order.id)}?returnTo=${encodeURIComponent(returnTo)}`;
    navigate(target, { state: { returnTo } });
  }

  async function markPaid(orderId) {
    setBusy(orderId);
    try {
      const updated = await requestJson(`${endpoint}/${orderId}/mark-paid`, {
        method: "POST",
      });
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updated : order)),
      );
    } catch (reason) {
      setNotice(reason.message);
    } finally {
      setBusy("");
    }
  }

  const ordersContent = (
    <>
      {(mode === "admin" || mode === "customer" || mode === "chef") && (
        <div className="orders-search">
          <label>
            Search order ID, restaurant, customer, or item
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders"
            />
          </label>
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {mode === "chef" && (
                <option value="ACTIVE">Active kitchen orders</option>
              )}
              <option value="ALL">All statuses</option>
              {[...new Set(orders.map((order) => order.status))]
                .sort()
                .map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
            </select>
          </label>
          {mode !== "chef" && (
            <>
              <label>
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              {mode !== "chef" && (
                <>
                  <option value="amount-low">Total: low to high</option>
                  <option value="amount-high">Total: high to low</option>
                </>
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter(mode === "chef" ? "ACTIVE" : "ALL");
              setDateFrom("");
              setDateTo("");
              setSort(mode === "chef" ? "oldest" : "newest");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {loading ? (
        <p className="orders-empty">Loading orders…</p>
      ) : error ? (
        <p className="orders-error" role="alert">
          {error}
        </p>
      ) : visibleOrders.length === 0 ? (
        mode === "manager" || mode === "chef" ? (
          <div className="manager-orders-empty">
            <CalendarDays size={28} />
            <strong>
              {calendarOrderCounts[selectedOrderDate]
                ? "No orders match these filters"
                : "No orders on this date"}
            </strong>
            <span>
              {calendarOrderCounts[selectedOrderDate]
                ? "Try changing the status or search filters."
                : "Choose another date to review its orders."}
            </span>
          </div>
        ) : (
          <p className="orders-empty">
            {orders.length ? "No orders match your search." : "No orders yet."}
          </p>
        )
      ) : (
        <div
          className={`orders-list${mode === "manager" ? " manager-orders-list" : ""}`}
        >
          {visibleOrders.map((order) =>
            mode === "manager" ? (
              <ManagerOrderCard
                key={order.id}
                order={order}
                busy={busy === order.id}
                onMarkPaid={markPaid}
                onUpdate={requestOrderUpdate}
                onOpen={() => openManagerOrder(order)}
              />
            ) : (
              <article className="food-order-card" key={order.id}>
                <div className="food-order-top">
                  <div>
                    <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                    <h2>
                      {mode === "customer"
                        ? order.restaurant_name
                        : `Order from ${order.customer_name}`}
                    </h2>
                    <small>{new Date(order.created_at).toLocaleString()}</small>
                  </div>
                  <strong
                    className={`food-order-status status-${order.status.toLowerCase()}`}
                  >
                    {statusLabel(order.status)}
                  </strong>
                </div>
                {mode === "chef" && (
                  <div className="chef-order-context">
                    <span>
                      <Clock3 size={15} />
                      {order.reservation?.start_time
                        ? `For ${order.reservation.start_time}`
                        : "Walk-in order"}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {order.reservation?.tables?.length
                        ? `Table ${order.reservation.tables.map((table) => table.table_number).join(", ")}`
                        : "No table assigned"}
                    </span>
                  </div>
                )}
                {mode === "admin" && (
                  <p className="food-order-restaurant">
                    {order.restaurant_name} ·{" "}
                    {order.customer_email || order.customer_name}
                  </p>
                )}
                <ul className="food-order-items">
                  {order.items.map((item) => (
                    <li key={item.variant_id}>
                      {item.image_url && (
                        <img
                          className="order-food-thumb"
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <span>
                        {item.quantity} × {item.food_name} · {item.variant_name}
                        {item.description && <small>{item.description}</small>}
                      </span>
                      <strong>₹{item.line_total.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
                {order.customer_note && (
                  <p className="food-order-note">
                    {mode === "chef"
                      ? "Customer preparation / allergy note:"
                      : "Note:"}{" "}
                    {order.customer_note}
                  </p>
                )}
                {mode === "chef" && order.reservation?.special_request && (
                  <p className="food-order-note">
                    Reservation request: {order.reservation.special_request}
                  </p>
                )}
                {order.status_reason && (
                  <p className="food-order-note">
                    Status note: {order.status_reason}
                  </p>
                )}
                {mode !== "chef" && (
                  <div className="food-order-total">
                    <div>
                      <span>Subtotal</span>
                      <strong>₹{order.subtotal.toFixed(2)}</strong>
                    </div>
                    {order.discount_amount > 0 && (
                      <div>
                        <span>Offer {order.offer_code}</span>
                        <strong>−₹{order.discount_amount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div>
                      <span>Total</span>
                      <strong>₹{order.total.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>
                        {order.payment_method === "WALLET"
                          ? order.payment_status
                          : "Pay at restaurant"}
                      </strong>
                    </div>
                  </div>
                )}
                {mode === "customer" && order.status === "PLACED" && (
                  <button
                    className="food-order-cancel"
                    type="button"
                    disabled={busy === order.id}
                    onClick={() => {
                      setActionReason("");
                      setPendingAction({ kind: "cancel", order });
                    }}
                  >
                    Cancel order
                  </button>
                )}
                {(mode === "manager" || mode === "chef") && (
                  <div className="food-order-actions">
                    {(transitions[mode][order.status] || []).map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy === order.id}
                        onClick={() =>
                          status === "REJECTED"
                            ? setPendingAction({
                                kind: "status",
                                order,
                                status,
                              })
                            : updateOrder(order.id, status)
                        }
                      >
                        {statusLabel(status)}
                      </button>
                    ))}
                    {mode === "chef" && order.status === "PLACED" && (
                      <span className="orders-empty">
                        Awaiting manager acceptance
                      </span>
                    )}
                    {mode === "manager" &&
                      ["PLACED", "ACCEPTED", "PREPARING"].includes(
                        order.status,
                      ) && (
                        <button
                          className="danger"
                          type="button"
                          disabled={busy === order.id}
                          onClick={() =>
                            setPendingAction({
                              kind: "status",
                              order,
                              status: "CANCELLED",
                            })
                          }
                        >
                          Cancel
                        </button>
                      )}
                  </div>
                )}
              </article>
            ),
          )}
        </div>
      )}
      {!loading && !error && matchingOrders.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={matchingOrders.length}
          onPageChange={setPage}
          label="orders"
        />
      )}
      {pendingAction && (
        <ConfirmActionDialog
          action="cancel"
          resourceType="food order"
          resourceName={`#${pendingAction.order.id.slice(0, 8).toUpperCase()}`}
          title={
            pendingAction.status === "REJECTED"
              ? "Reject this order?"
              : "Cancel this order?"
          }
          description={
            pendingAction.status === "REJECTED"
              ? "The order will be rejected and cannot continue through preparation."
              : "The order will be cancelled. Any eligible refund will be credited to the customer’s DineBook wallet."
          }
          confirmLabel={
            pendingAction.status === "REJECTED"
              ? "Reject order"
              : "Cancel order"
          }
          requireReason
          reasonLabel={
            pendingAction.status === "REJECTED"
              ? "Rejection reason"
              : "Cancellation reason"
          }
          reason={actionReason}
          onReasonChange={setActionReason}
          busy={busy === pendingAction.order.id}
          onCancel={() => {
            if (busy !== pendingAction.order.id) setPendingAction(null);
          }}
          onConfirm={confirmOrderAction}
        />
      )}
    </>
  );

  const content = (
    <div className={`orders-page orders-page-${mode}`}>
      <header className="orders-page-heading">
        <div>
          {mode === "manager" ? (
            <span className="manager-orders-breadcrumb">
              Home <i>/</i> <b>Orders</b>
            </span>
          ) : (
            <span>{mode === "admin" ? "SUPPORT LOOKUP" : "FOOD ORDERS"}</span>
          )}
          <h1>
            {mode === "customer"
              ? "Order history"
              : mode === "chef"
                ? "Kitchen orders"
                : mode === "admin"
                  ? "Order lookup"
                  : "Orders Calendar"}
          </h1>
          <p>
            {mode === "customer"
              ? "Track orders and view your checkout totals."
              : mode === "chef"
                ? "Update preparation progress for accepted orders."
                : mode === "admin"
                  ? "Read-only order lookup across restaurants."
                  : "View and manage restaurant orders by date."}
          </p>
          {mode !== "admin" && (
            <span
              className={`realtime-status realtime-${realtimeStatus}`}
              aria-live="polite"
            >
              {realtimeStatus === "connected"
                ? "Live updates connected"
                : realtimeStatus === "reconnecting"
                  ? "Reconnecting to live updates…"
                  : realtimeStatus === "disconnected"
                    ? "Live updates disconnected · Refresh to sync"
                    : "Connecting to live updates…"}
            </span>
          )}
        </div>
        {mode === "manager" ? (
          <div
            className="manager-order-top-controls"
            aria-label="Order filters"
          >
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                value={managerStatusFilter}
                onChange={(event) => setManagerStatusFilter(event.target.value)}
                aria-label="Filter orders by status"
              >
                {managerOrderFilters.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL"
                      ? `All orders (${orders.length})`
                      : `${statusLabel(status)} (${orders.filter((order) => order.status === status).length})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="manager-order-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID, guest…"
                aria-label="Search orders"
              />
            </label>

            <button type="button" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        ) : (
          <button type="button" onClick={load} disabled={loading}>
            Refresh
          </button>
        )}
      </header>
      {notice && (
        <p className="orders-notice" role="status">
          {notice}
        </p>
      )}
      {mode === "manager" && <></>}
      {(mode === "manager" || mode === "chef") && (
        <>
          <div className="manager-orders-calendar-layout">
            <section
              className={`manager-orders-calendar${mode === "chef" ? " chef-orders-calendar" : ""}`}
              aria-label="Orders calendar"
            >
              <div className="manager-orders-calendar-legend">
                <span>
                  <i className="placed" />
                  New
                </span>
                <span>
                  <i className="progress" />
                  In progress
                </span>
                <span>
                  <i className="ready" />
                  Ready
                </span>
                <span>
                  <i className="cancelled" />
                  Cancelled
                </span>
                <span>
                  <i className="done" />
                  Completed
                </span>
              </div>
              <div className="manager-orders-calendar-header">
                <h2>
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    year: "numeric",
                  }).format(orderMonth)}
                </h2>
                <div>
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setOrderMonth(
                        (month) =>
                          new Date(
                            month.getFullYear(),
                            month.getMonth() - 1,
                            1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setOrderMonth(
                        (month) =>
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            1,
                          ),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="manager-orders-calendar-grid">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                  (day) => (
                    <span className="weekday" key={day}>
                      {day}
                    </span>
                  ),
                )}
                {calendarDays.map((day) => {
                  const key = dateKey(day);
                  const currentMonth = day.getMonth() === orderMonth.getMonth();
                  const dayOrders = orders.filter(
                    (order) => orderDateKey(order) === key,
                  );
                  const statusDots = [
                    ...new Set(
                      dayOrders.map((order) =>
                        order.status === "PLACED"
                          ? "placed"
                          : ["ACCEPTED", "PREPARING"].includes(order.status)
                            ? "progress"
                            : order.status === "READY"
                              ? "ready"
                              : order.status === "COMPLETED"
                                ? "done"
                                : "cancelled",
                      ),
                    ),
                  ];
                  return (
                    <button
                      type="button"
                      key={key}
                      disabled={!currentMonth}
                      className={`manager-orders-calendar-day${currentMonth ? "" : " outside"}${!currentMonth ? " disabled-date" : ""}${key === selectedOrderDate ? " selected" : ""}${key === dateKey(new Date()) ? " today" : ""}`}
                      onClick={() => setSelectedOrderDate(key)}
                      aria-label={`${day.toLocaleDateString("en", { dateStyle: "full" })}, ${calendarOrderCounts[key] || 0} orders`}
                    >
                      <span className="day-number">{day.getDate()}</span>
                      {calendarOrderCounts[key] > 0 && (
                        <span className="day-count">
                          {calendarOrderCounts[key]}
                        </span>
                      )}
                      <span className="day-dots">
                        {statusDots.map((tone) => (
                          <i className={tone} key={tone} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="manager-orders-calendar-hint">
                Select a day to view its orders.{" "}
                {mode === "chef"
                  ? "Kitchen orders are grouped by visit date."
                  : "Reservation orders are grouped by visit date."}
              </p>
            </section>
            <section
              className={`manager-orders-day${mode === "chef" ? " chef-orders-day" : ""}`}
            >
              <header>
                <h2>
                  {mode === "chef" ? "Kitchen orders" : "Orders"} –{" "}
                  {new Date(`${selectedOrderDate}T12:00:00`).toLocaleDateString(
                    "en",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </h2>
                <div>
                  <strong>{matchingOrders.length} Orders</strong>
                  <strong>
                    {matchingOrders.reduce(
                      (items, order) =>
                        items +
                        order.items.reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0,
                        ),
                      0,
                    )}{" "}
                    Items
                  </strong>
                </div>
              </header>
              {ordersContent}
            </section>
          </div>
        </>
      )}
      {mode !== "manager" && mode !== "chef" && ordersContent}
    </div>
  );

  if (mode === "manager")
    return <ManagerLayout title="Orders">{content}</ManagerLayout>;
  if (mode === "admin")
    return (
      <AdminLayout title="Order lookup" activePath="/admin/orders">
        {content}
      </AdminLayout>
    );
  if (mode === "chef")
    return <ChefLayout title="Kitchen Orders">{content}</ChefLayout>;
  return (
    <main className="customer-orders-shell">
      <CustomerHeader user={headerUser} />
      {content}
      <Link className="orders-back-link" to="/customer/profile">
        Back to profile
      </Link>
    </main>
  );
}

function ManagerOrderCard({ order, busy, onMarkPaid, onUpdate, onOpen }) {
  const actionStatuses = transitions.manager[order.status] || [];
  const tableNames = (order.tables || order.reservation?.tables || [])
    .map((table) => table.table_number)
    .filter(Boolean);
  const paymentDue =
    order.payment_status === "PENDING" &&
    !["CANCELLED", "REJECTED"].includes(order.status);
  const itemCount = order.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const placedTime = new Date(order.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const visitDate = order.reservation?.reservation_date
    ? new Date(
        `${order.reservation.reservation_date}T12:00:00`,
      ).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : null;

  return (
    <article className="manager-order-card">
      <button
        type="button"
        className="manager-order-card-open"
        onClick={onOpen}
        aria-label={`Open order ${order.id.slice(0, 8).toUpperCase()} details`}
      >
        <span className="manager-order-avatar">
          {(order.customer_name || "Guest")
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="manager-order-guest">
          <strong>{order.customer_name || "Guest order"}</strong>
          <small>
            {order.customer_email ||
              `Order #${order.id.slice(0, 8).toUpperCase()}`}
          </small>
        </span>
        <span
          className={`manager-order-status status-${order.status.toLowerCase()}`}
        >
          {statusLabel(order.status)}
        </span>
        <ChevronRight
          className="manager-order-expand-icon"
          size={17}
          aria-hidden="true"
        />
        <span className="manager-order-card-meta">
          <span>
            <Clock3 size={14} />
            Placed {placedTime}
          </span>
          <span>
            <Package size={14} />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          {visitDate && (
            <span>
              <CalendarDays size={14} />
              Visit {visitDate} · {order.reservation.start_time}
            </span>
          )}
          <span>
            {tableNames.length ? (
              <>
                <MapPin size={14} />
                Table {tableNames.join(", ")}
              </>
            ) : (
              <>
                <Users size={14} />
                Walk-in order
              </>
            )}
            <b className="manager-order-summary-total">{`₹${Number(order.total).toFixed(2)}`}</b>
          </span>
        </span>
      </button>
      {(paymentDue ||
        actionStatuses.length ||
        ["PLACED", "ACCEPTED", "PREPARING"].includes(order.status)) && (
        <footer className="manager-order-card-actions">
          {paymentDue && order.payment_method === "PAY_AT_DESK" && (
            <button
              type="button"
              className="manager-order-pay"
              disabled={busy}
              onClick={() => onMarkPaid(order.id)}
            >
              {busy ? "Recording…" : "Mark payment received"}
            </button>
          )}
          {actionStatuses.map((status) => (
            <button
              type="button"
              key={status}
              disabled={busy}
              onClick={() => onUpdate(order.id, status)}
            >
              {busy ? "Updating…" : statusLabel(status)}
            </button>
          ))}
          {["PLACED", "ACCEPTED", "PREPARING"].includes(order.status) && (
            <button
              type="button"
              className="manager-order-cancel"
              disabled={busy}
              onClick={() => onUpdate(order.id, "CANCELLED")}
            >
              Cancel order
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
