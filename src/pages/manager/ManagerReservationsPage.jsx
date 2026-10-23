import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  QrCode,
  Upload,
  Search,
  Users,
  X,
} from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import Pagination from "../../components/Pagination.jsx";
import jsQR from "jsqr";
import "./ManagerReservationsPage.css";

const statusClass = {
  CONFIRMED: "confirmed",
  PENDING_PAYMENT: "pending",
  CANCELLED: "cancelled",
  REJECTED: "cancelled",
  NO_SHOW: "cancelled",
  COMPLETED: "completed",
  SEATED: "confirmed",
};
const statusLabel = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Payment due",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  NO_SHOW: "No show",
  COMPLETED: "Completed",
  SEATED: "Seated",
};
const activityStatusLabels = {
  ...statusLabel,
  PLACED: "Sent to kitchen",
  ACCEPTED: "Accepted by kitchen",
  PREPARING: "Being prepared",
  READY: "Ready to serve",
};
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const orderTone = (status) => ({
  PLACED: "pending", ACCEPTED: "confirmed", PREPARING: "confirmed",
  READY: "completed", COMPLETED: "completed", CANCELLED: "cancelled", REJECTED: "cancelled",
}[status] || "pending");
const orderStatusLabel = (status) => ({
  PLACED: "Sent to kitchen",
  ACCEPTED: "Accepted by kitchen",
  PREPARING: "Being prepared",
  READY: "Ready to serve",
  COMPLETED: "Served",
  CANCELLED: "Removed",
  REJECTED: "Declined by kitchen",
}[status] || "Order update pending");
const shortTime = (value) => {
  if (!value) return "";
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};
const consolidateDeskOrderLines = (lines) => {
  const quantities = new Map();
  lines.forEach(({ variant_id, quantity }) => {
    quantities.set(variant_id, (quantities.get(variant_id) || 0) + Number(quantity));
  });
  return [...quantities].map(([variant_id, quantity]) => ({ variant_id, quantity }));
};

export default function ManagerReservationsPage() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [calendarDays, setCalendarDays] = useState({});
  const [tables, setTables] = useState([]);
  const [reservationTotal, setReservationTotal] = useState(0);
  const [reservationGuestCount, setReservationGuestCount] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [workingDays, setWorkingDays] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tableFilter, setTableFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [guestFilter, setGuestFilter] = useState("all");
  const [reservationSort, setReservationSort] = useState("time");
  const [listPage, setListPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("reservationId") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => new URLSearchParams(window.location.search).get("reservationId") || "");
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingOrderRemoval, setPendingOrderRemoval] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState("");
  const [foodReservation, setFoodReservation] = useState(null);
  const [deskOrderReservation, setDeskOrderReservation] = useState(null);
  const [deskOrderKey, setDeskOrderKey] = useState("");
  const [deskOrderLines, setDeskOrderLines] = useState([]);
  const [reservationOrders, setReservationOrders] = useState({});
  const [ordersLoadingId, setOrdersLoadingId] = useState("");
  const [menu, setMenu] = useState([]);
  const [menuBusy, setMenuBusy] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [foodQuantity, setFoodQuantity] = useState(1);
  const [cameraActive, setCameraActive] = useState(false);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const scanActiveRef = useRef(false);

  useEffect(() => {
    if (!scannerOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(".reservation-pass-dialog");
    dialog?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setScannerOpen(false);
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length && getComputedStyle(element).opacity !== "0");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      scanActiveRef.current = false;
      cameraRef.current?.getTracks().forEach((track) => track.stop());
      cameraRef.current = null;
      setCameraActive(false);
      previousFocus?.focus();
    };
  }, [scannerOpen]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadCalendarSummary = useCallback(async () => {
    const startDate = dayKey(new Date(month.getFullYear(), month.getMonth(), 1));
    const endDate = dayKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    try {
      const result = await requestJson(`/api/manager/calendar/summary?${new URLSearchParams({ start_date: startDate, end_date: endDate })}`);
      setCalendarDays(result.days || {});
      setTables(result.tables || []);
    } catch (e) {
      setError(e.message);
    }
  }, [month]);

  const loadCalendarActivities = useCallback(async (signal) => {
    setCalendarLoading(true);
    const params = new URLSearchParams({
      day: selectedDate,
      page: String(listPage),
      order_page: String(orderPage),
      page_size: String(listPageSize),
      sort: reservationSort,
    });
    if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (tableFilter !== "all") params.set("table_id", tableFilter);
    if (guestFilter !== "all") params.set("guest_filter", guestFilter);
    try {
      const result = await requestJson(`/api/manager/calendar/activities?${params}`, { signal });
      setItems(result.reservations.items || []);
      setOrders(result.orders.items || []);
      setReservationTotal(result.reservations.total || 0);
      setReservationGuestCount(result.reservations.guest_count || 0);
      setOrdersTotal(result.orders.total || 0);
      if (result.reservation_lookup_date) {
        setSelectedDate(result.reservation_lookup_date);
        setMonth(new Date(`${result.reservation_lookup_date}T12:00:00`));
        setExpandedId(result.reservations.items?.[0]?.id || "");
      }
      setError("");
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    } finally {
      if (!signal?.aborted) setCalendarLoading(false);
    }
  }, [selectedDate, listPage, orderPage, listPageSize, reservationSort, debouncedQuery, statusFilter, tableFilter, guestFilter]);

  const realtimeStatus = useRealtimeEvents({
    enabled: true,
    onEvent: (event) => {
      if (["booking.updated", "order.status_changed", "payment.status_changed"].includes(event?.event_type)) {
        loadCalendarActivities();
        loadCalendarSummary();
      }
    },
    onReconnect: () => {
      loadCalendarActivities();
      loadCalendarSummary();
    },
  });
  useEffect(() => { loadCalendarSummary(); }, [loadCalendarSummary]);
  const calendarFilterKey = JSON.stringify([selectedDate, tableFilter, debouncedQuery, statusFilter, guestFilter, reservationSort, listPageSize]);
  const previousCalendarFilterKey = useRef(calendarFilterKey);
  useEffect(() => {
    const filtersChanged = previousCalendarFilterKey.current !== calendarFilterKey;
    previousCalendarFilterKey.current = calendarFilterKey;
    if (filtersChanged && (listPage !== 1 || orderPage !== 1)) {
      setListPage(1);
      setOrderPage(1);
      return;
    }
    const controller = new AbortController();
    loadCalendarActivities(controller.signal);
    return () => controller.abort();
  }, [calendarFilterKey, listPage, orderPage, loadCalendarActivities]);
  useEffect(() => {
    requestJson("/api/auth/manager/me")
      .then((manager) => setWorkingDays(Array.isArray(manager.restaurant_hours) ? manager.restaurant_hours : []))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setListPage((current) => Math.min(current, Math.max(1, Math.ceil(reservationTotal / listPageSize))));
    setOrderPage((current) => Math.min(current, Math.max(1, Math.ceil(ordersTotal / listPageSize))));
  }, [reservationTotal, ordersTotal, listPageSize]);
  const reservationIdQuery = query.trim().replaceAll("-", "").toLowerCase();
  const isReservationIdLookup = reservationIdQuery.length >= 6 && [...reservationIdQuery].every((char) => "0123456789abcdef".includes(char));
  const selectedItems = items;
  const selectedStandaloneOrders = orders;
  const selectedDateOrderCount = calendarDays[selectedDate]?.orders_count || 0;
  const visibleSelectedItems = selectedItems;
  const dayGuestCount = reservationGuestCount;

  const monthCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
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
  }, [month]);

  async function update(item, action, reason = "") {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/${action}`, {
        method: "POST",
        ...(action === "cancel" ? { body: JSON.stringify({ reason: reason.trim() || null }) } : {}),
      });
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function updateReservationStatus(item, status, reason = "") {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: reason.trim() || null }),
      });
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function verifyPass(value) {
    const raw = String(value || "").trim();
    if (!raw) return;
    let id = raw;
    try {
      const parsed = JSON.parse(raw);
      id = parsed.reservation_id || parsed.reservationId || parsed.id || raw;
    } catch {
      // Some passes may contain the reservation ID as plain text.
    }
    const normalized = String(id).replaceAll("-", "").toLowerCase();
    const match = items.find((reservation) => reservation.id.replaceAll("-", "").toLowerCase().startsWith(normalized));
    if (match && normalized.length >= 6) id = match.id;
    setScanBusy(true);
    setScanError("");
    try {
      const reservation = await requestJson(`/api/manager/reservations/${encodeURIComponent(id)}`);
      setQuery(reservation.id);
      setSelectedDate(reservation.reservation_date);
      const date = new Date(`${reservation.reservation_date}T12:00:00`);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setExpandedId(reservation.id);
      setScannerOpen(false);
      setScanValue("");
    } catch (e) {
      setScanError(e.message?.includes("valid UUID") ? "Enter a valid reservation ID, or scan or upload the customer’s QR pass." : e.message || "Could not verify this pass for your restaurant.");
    } finally {
      setScanBusy(false);
    }
  }

  async function openFoodEditor(item) {
    setFoodReservation(item);
    setVariantId("");
    setFoodQuantity(1);
    setMenuBusy(true);
    try {
      setMenu(await requestJson("/api/manager/menu"));
    } catch (e) {
      setError(e.message);
    } finally {
      setMenuBusy(false);
    }
  }

  async function addFood(event) {
    event.preventDefault();
    if (!foodReservation || !variantId) return;
    setBusyId(foodReservation.id);
    try {
      await requestJson(`/api/manager/reservations/${foodReservation.id}/preorder-items`, {
        method: "POST",
        body: JSON.stringify({ variant_id: variantId, quantity: Number(foodQuantity) }),
      });
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
      setFoodReservation(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function loadReservationOrders(reservationId) {
    setOrdersLoadingId(reservationId);
    try {
      const data = await requestJson(`/api/manager/reservations/${reservationId}/orders`);
      setReservationOrders((current) => ({ ...current, [reservationId]: data }));
    } catch (e) {
      setError(e.message);
    } finally {
      setOrdersLoadingId("");
    }
  }

  async function removeManagerAddedOrder() {
    if (!pendingOrderRemoval) return;
    const { order, reservationId } = pendingOrderRemoval;
    setBusyId(order.id);
    setError("");
    try {
      const updated = await requestJson(`/api/manager/orders/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED", reason: "Removed by manager because it was added by mistake." }),
      });
      setReservationOrders((current) => ({
        ...current,
        [reservationId]: (current[reservationId] || []).map((entry) => entry.id === updated.id ? updated : entry),
      }));
      await loadCalendarSummary();
      setPendingOrderRemoval(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function queueExistingPreorder(item) {
    setBusyId(item.id);
    try {
      const order = await requestJson(`/api/manager/reservations/${item.id}/preorder-order`, { method: "POST" });
      setReservationOrders((current) => ({
        ...current,
        [item.id]: [...(current[item.id] || []).filter((entry) => entry.id !== order.id), order],
      }));
      await loadReservationOrders(item.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function openDeskOrder(item) {
    setDeskOrderReservation(item);
    setDeskOrderKey(window.crypto.randomUUID());
    setDeskOrderLines([{ key: window.crypto.randomUUID(), variant_id: "", quantity: 1 }]);
    setVariantId("");
    setFoodQuantity(1);
    setMenuBusy(true);
    try {
      setMenu(await requestJson("/api/manager/menu"));
    } catch (e) {
      setError(e.message);
    } finally {
      setMenuBusy(false);
    }
  }

  async function createDeskOrder(event) {
    event.preventDefault();
    const orderItems = consolidateDeskOrderLines(deskOrderLines);
    if (!deskOrderReservation || !deskOrderLines.length || deskOrderLines.some((line) => !line.variant_id || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 || Number(line.quantity) > 99) || orderItems.some((line) => line.quantity > 99)) return;
    setBusyId(deskOrderReservation.id);
    try {
      const order = await requestJson(`/api/manager/reservations/${deskOrderReservation.id}/orders`, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: deskOrderKey,
          items: orderItems,
          payment_method: "PAY_AT_DESK",
          customer_note: "Manager desk order",
        }),
      });
      setReservationOrders((current) => ({
        ...current,
        [deskOrderReservation.id]: [...(current[deskOrderReservation.id] || []).filter((entry) => entry.id !== order.id), order],
      }));
      await loadCalendarSummary();
      setDeskOrderReservation(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function confirmPreorderPayment(item) {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/confirm-preorder-payment`, { method: "POST" });
      await Promise.all([loadCalendarActivities(), loadCalendarSummary()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  const availableVariants = menu.filter((category) => category.is_active).flatMap((category) => (category.foods || [])
    .filter((food) => food.is_available)
    .flatMap((food) => (food.variants || [])
      .filter((variant) => variant.is_available)
      .map((variant) => ({ ...variant, foodName: food.name }))));

  function moveMonth(direction) {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  const monthTitle = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(month);
  const selectedLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${selectedDate}T12:00:00`));

  return (
    <ManagerLayout title="Reservation Management">
      <main className="manager-dashboard-content reservation-page">
        <div className="reservation-page-heading">
          <div>
            <div className="reservation-breadcrumb">
              Home <span>/</span> <strong>Reservations &amp; Orders</strong>
            </div>
            <h2>Reservations &amp; Orders</h2>
            <p>View reservations, preorders, and kitchen orders together by date · {realtimeStatus === "connected" ? "Live updates connected" : realtimeStatus === "reconnecting" ? "Reconnecting to live updates…" : realtimeStatus === "disconnected" ? "Live updates disconnected · Refresh to sync" : "Connecting to live updates…"}</p>
          </div>
          <div className="reservation-toolbar">
            <button type="button" className="reservation-scan-trigger" onClick={() => { setScannerOpen(true); setScanError(""); }}><QrCode size={16} /> Scan pass</button>
            <select
              aria-label="Filter by table"
              value={tableFilter}
              onChange={(event) => setTableFilter(event.target.value)}
            >
              <option value="all">Filter by Table: All</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Table {table.table_number}
                </option>
              ))}
            </select>
            <select aria-label="Filter by reservation or order status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(activityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="Filter by party size" value={guestFilter} onChange={(event) => setGuestFilter(event.target.value)}><option value="all">All party sizes</option>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={String(count)}>{count} guests</option>)}<option value="6+">6+ guests</option></select>
            <select aria-label="Sort reservations" value={reservationSort} onChange={(event) => setReservationSort(event.target.value)}><option value="time">Time: earliest first</option><option value="guests">Party size: smallest first</option></select>
            <div className="reservation-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reservations, orders, guests, items…"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="reservation-error" role="alert">
            {error}
          </div>
        )}
        <div className="reservation-workspace">
          <div className="reservation-primary-column">
            <section className="reservation-calendar-card">
              <div className="reservation-legend">
                <span>
                  <i className="confirmed" />
                  Confirmed
                </span>
                <span>
                  <i className="pending" />
                  Payment due
                </span>
                <span>
                  <i className="cancelled" />
                  Cancelled
                </span>
                <span>
                  <i className="completed" />
                  Completed
                </span>
              </div>
              <div className="reservation-calendar-header">
                <h3>{monthTitle}</h3>
                <div>
                  <button
                    type="button"
                    onClick={() => moveMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>
              <div className="reservation-calendar-grid">
                {weekDays.map((day) => (
                  <div className="reservation-weekday" key={day}>
                    {day}
                  </div>
                ))}
                {monthCells.map((day) => {
                  const key = dayKey(day);
                  const daySummary = calendarDays[key] || {};
                  const reservationCount = daySummary.reservations_count || 0;
                  const orderCount = daySummary.orders_count || 0;
                  const currentMonth = day.getMonth() === month.getMonth();
                  const schedule = workingDays?.find((entry) =>
                    String(entry.day_of_week).toLowerCase() === day.toLocaleDateString("en", { weekday: "long" }).toLowerCase(),
                  );
                  const workingDay = workingDays === null
                    ? false
                    : workingDays.length === 0 || Boolean(schedule?.enabled && schedule.open_time && schedule.close_time);
                  const disabled = !currentMonth || (!workingDay && reservationCount === 0 && orderCount === 0);
                  const selected = key === selectedDate;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      disabled={disabled}
                      aria-label={`${day.toLocaleDateString("en", { dateStyle: "full" })}${workingDay ? "" : ", closed"}`}
                      title={disabled ? (currentMonth ? "Restaurant is closed" : "Outside the displayed month") : undefined}
                      className={`reservation-calendar-day${currentMonth ? "" : " outside"}${disabled ? " disabled-date" : ""}${selected ? " selected" : ""}${key === dayKey(new Date()) ? " today" : ""}`}
                    >
                      <span className="reservation-day-number">
                        {day.getDate()}
                      </span>
                      {reservationCount + orderCount > 0 && (
                        <span className="reservation-day-count">
                          {reservationCount + orderCount}
                        </span>
                      )}
                      <span className="reservation-day-dots">
                        {(daySummary.tones || []).map((tone) => (
                          <i className={tone} key={tone} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="reservation-list-column">
            <header className="reservation-list-summary">
              <h3>{isReservationIdLookup ? "Reservation ID lookup" : `Reservations & Orders – ${selectedLabel}`}</h3>
              <span className="booking-count">
                {reservationTotal} Reservations
              </span>
              <span className="booking-count">{selectedDateOrderCount} Orders</span>
              <span className="guest-count">{dayGuestCount} Guests</span>
            </header>
            <div className="reservation-list-scroll">
              {calendarLoading && selectedItems.length === 0 && selectedStandaloneOrders.length === 0 ? (
                <div className="reservation-empty"><CalendarDays size={28} /><strong>Loading this date…</strong></div>
              ) : selectedItems.length === 0 && selectedStandaloneOrders.length === 0 ? (
                <div className="reservation-empty">
                  <CalendarDays size={28} />
                  <strong>No reservations or orders on this date</strong>
                  <span>
                    Choose another date or adjust the table or search filters.
                  </span>
                </div>
              ) : <>
                {visibleSelectedItems.map((item) => (
                  <article
                    className={`reservation-guest-card${expandedId === item.id ? " expanded" : ""}`}
                    key={item.id}
                  >
                    <div className="reservation-guest-top">
                      <div className="reservation-avatar">
                        {item.customer_name
                          ?.split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="reservation-guest-name">
                        <strong>{item.customer_name}</strong>
                        <span>{item.customer_email || "Customer"}</span>
                      </div>
                      <button
                        className="reservation-expand"
                        type="button"
                        aria-label="Show reservation details"
                        onClick={() =>
                          expandedId === item.id
                            ? setExpandedId("")
                            : (setExpandedId(item.id), loadReservationOrders(item.id))
                        }
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                    <div className="reservation-guest-meta">
                      <span>
                        <Clock3 size={14} />
                        {shortTime(item.start_time)} –{" "}
                        {shortTime(item.end_time)}
                      </span>
                      <span>
                        <Users size={14} />
                        {item.number_of_guests} Guests
                      </span>
                      <span>
                        <CalendarDays size={14} />
                        {item.tables
                          .map((table) => `Table ${table.table_number}`)
                          .join(", ")}
                      </span>
                      <span
                        className={`reservation-status ${statusClass[item.status] || "pending"}`}
                      >
                        {statusLabel[item.status] || item.status}
                      </span>
                    </div>
                    {expandedId === item.id && (
                      <div className="reservation-expanded-details">
                        <strong>Reservation ID · {item.id.slice(0, 8).toUpperCase()}</strong>
                        <span>
                          {item.tables
                            .map(
                              (table) =>
                                `${table.floor_name} · Table ${table.table_number}`,
                            )
                            .join(", ")}
                        </span>
                        <strong>Reservation fee ₹{Number(item.fee_amount).toFixed(2)} · {item.payment_status}</strong>
                        <strong>{item.fulfillment_type === "PREORDER" ? `Preorder · ₹${Number(item.preorder_total || 0).toFixed(2)} · ${item.preorder_payment_status === "PAID" ? "Paid" : "Due at desk"}` : "Table reservation only"}</strong>
                        {Number(item.preorder_due_at_desk || 0) > 0 && <strong>Food due at desk · ₹{Number(item.preorder_due_at_desk).toFixed(2)}</strong>}
                        {item.preorder_items?.length > 0 && <ul>{item.preorder_items.map((food) => <li key={food.variant_id}>{food.quantity} × {food.food_name} · {food.variant_name} — ₹{Number(food.line_total).toFixed(2)}</li>)}</ul>}
                        <div className="reservation-linked-orders">
                          <strong>Food orders for this visit</strong>
                          {ordersLoadingId === item.id ? <span>Loading orders…</span> : (reservationOrders[item.id] || []).length === 0 ? <span>No food orders have been sent to the kitchen yet.</span> : (reservationOrders[item.id] || []).map((order) => {
                            const managerAdded = order.customer_note === "Manager desk order";
                            const canRemove = managerAdded && ["PLACED", "ACCEPTED", "PREPARING"].includes(order.status);
                            return <article className="reservation-linked-order" key={order.id}>
                              <div className="reservation-linked-order-content">
                                <div className="reservation-linked-order-heading">
                                  <strong>{managerAdded ? "Added by manager" : order.is_preorder ? "Customer preorder" : "Reservation order"}</strong>
                                  <span className={`reservation-order-progress ${orderTone(order.status)}`}>{orderStatusLabel(order.status)}</span>
                                </div>
                                <ul>{(order.items || []).map((food, index) => <li key={`${food.variant_id || food.food_name}-${index}`}><span>{food.quantity} × {food.food_name}{food.variant_name ? ` · ${food.variant_name}` : ""}</span><strong>₹{Number(food.line_total).toFixed(2)}</strong></li>)}</ul>
                                <div className="reservation-linked-order-footer">
                                  <strong>Order total · ₹{Number(order.total).toFixed(2)}</strong>
                                  <span>{order.payment_status === "PAID" ? "Paid" : "Payment due at desk"}</span>
                                </div>
                              </div>
                              <div className="reservation-linked-order-actions">
                                <Link to={`/manager/orders/${order.id}`}>View details</Link>
                                {canRemove && <button type="button" onClick={() => setPendingOrderRemoval({ order, reservationId: item.id })}>Remove order</button>}
                              </div>
                            </article>;
                          })}
                          {item.status === "SEATED" && item.fulfillment_type === "PREORDER" && item.preorder_items?.length > 0 && !(reservationOrders[item.id] || []).some((order) => order.is_preorder) && <button type="button" disabled={busyId === item.id || ordersLoadingId === item.id} onClick={() => queueExistingPreorder(item)}>{busyId === item.id ? "Sending…" : "Send existing preorder to kitchen"}</button>}
                          {item.status === "SEATED" && !(item.fulfillment_type === "PREORDER" && item.preorder_items?.length > 0) && <button type="button" onClick={() => openDeskOrder(item)}>Order at desk</button>}
                        </div>
                        {item.special_request && <p>{item.special_request}</p>}
                        {["CONFIRMED", "SEATED"].includes(item.status) && item.preorder_payment_method === "PAY_AT_DESK" && item.preorder_payment_status === "PENDING" && <button type="button" disabled={busyId === item.id} onClick={() => confirmPreorderPayment(item)}>{busyId === item.id ? "Recording…" : "Record preorder payment received"}</button>}
                        {item.status === "PENDING_PAYMENT" && (
                          <div>
                            {item.fulfillment_type !== "PREORDER" && <button type="button" disabled={busyId === item.id} onClick={() => openFoodEditor(item)}>Add food before confirming</button>}
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() =>
                                setPendingAction({
                                  item,
                                  action: "confirm-payment",
                                })
                              }
                            >
                              Record payment & confirm
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => { setActionReason(""); setPendingAction({ item, action: "cancel" }); }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {item.status === "PENDING_PAYMENT" && <button type="button" disabled={busyId === item.id} onClick={() => { setActionReason(""); setPendingAction({ item, action: "reject" }); }}>Reject reservation</button>}
                        {item.status === "CONFIRMED" && <><button type="button" disabled={busyId === item.id} onClick={() => updateReservationStatus(item, "SEATED")}>{busyId === item.id ? "Updating…" : "Mark guest seated"}</button><button type="button" disabled={busyId === item.id} onClick={() => { setActionReason(""); setPendingAction({ item, action: "no-show" }); }}>Mark no-show</button><button type="button" disabled={busyId === item.id} onClick={() => { setActionReason(""); setPendingAction({ item, action: "cancel" }); }}>Cancel reservation</button></>}
                        {item.status === "SEATED" && <button type="button" disabled={busyId === item.id} onClick={() => updateReservationStatus(item, "COMPLETED")}>{busyId === item.id ? "Updating…" : "Complete dining session"}</button>}
                      </div>
                    )}
                  </article>
                ))}
                {selectedStandaloneOrders.length > 0 && <section className="reservation-standalone-orders">
                  <h4>Walk-in &amp; spot orders</h4>
                  {selectedStandaloneOrders.map((order) => <Link className="reservation-standalone-order" key={order.id} to={`/manager/orders/${order.id}?returnTo=${encodeURIComponent("/manager/reservations")}`}>
                    <span className="reservation-standalone-order-main"><strong>{order.customer_name || "Guest order"}</strong><small>{order.is_preorder ? "Preorder" : order.order_source === "SPOT" ? "Spot order" : "Walk-in order"} · {shortTime(new Date(order.created_at).toTimeString())} · {order.items?.map((food) => `${food.quantity} × ${food.food_name}`).join(", ")}</small></span>
                    <span className={`reservation-status ${orderTone(order.status)}`}>{orderStatusLabel(order.status)}</span>
                    <strong>₹{Number(order.total).toFixed(2)}</strong>
                  </Link>)}
                  {ordersTotal > 0 && <Pagination page={orderPage} pageSize={listPageSize} total={ordersTotal} onPageChange={setOrderPage} onPageSizeChange={setListPageSize} pageSizes={[5, 10, 20]} label="orders" />}
                </section>}
              </>}
              {reservationTotal > 0 && <Pagination page={listPage} pageSize={listPageSize} total={reservationTotal} onPageChange={setListPage} onPageSizeChange={setListPageSize} pageSizes={[5, 10, 20]} label="reservations" />}
            </div>
          </aside>
        </div>
      </main>
      {pendingAction && ["cancel", "reject", "no-show"].includes(pendingAction.action) && <ConfirmActionDialog
        action="cancel"
        resourceType="reservation"
        resourceName={pendingAction.item.customer_name}
        title={pendingAction.action === "reject" ? "Reject this reservation?" : pendingAction.action === "no-show" ? "Mark guest as a no-show?" : "Cancel this reservation?"}
        description={`This will mark ${pendingAction.item.customer_name}'s reservation as ${pendingAction.action === "no-show" ? "a no-show" : pendingAction.action === "reject" ? "rejected" : "cancelled"}. Any eligible refund follows the existing wallet refund policy.`}
        confirmLabel={pendingAction.action === "reject" ? "Reject reservation" : pendingAction.action === "no-show" ? "Mark no-show" : "Cancel reservation"}
        showReason
        reasonLabel="Reason (optional)"
        reason={actionReason}
        onReasonChange={setActionReason}
        busy={busyId === pendingAction.item.id}
        onCancel={() => { if (busyId !== pendingAction.item.id) setPendingAction(null); }}
        onConfirm={async (reason) => {
          let succeeded = false;
          if (pendingAction.action === "cancel") succeeded = await update(pendingAction.item, "cancel", reason);
          else if (pendingAction.action === "reject") succeeded = await updateReservationStatus(pendingAction.item, "REJECTED", reason);
          else succeeded = await updateReservationStatus(pendingAction.item, "NO_SHOW", reason);
          if (succeeded) setPendingAction(null);
        }}
      />}
      {pendingAction?.action === "confirm-payment" && (
        <div
          className="manager-reservation-confirm-backdrop"
          role="presentation"
        >
          <section
            className="manager-reservation-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="manager-reservation-confirm-title"
            aria-describedby="manager-reservation-confirm-description"
          >
            <button
              type="button"
              className="manager-reservation-confirm-close"
              onClick={() => setPendingAction(null)}
              disabled={busyId === pendingAction.item.id}
              aria-label="Close confirmation"
            >
              <X size={18} />
            </button>
            <div
              className={`manager-reservation-confirm-icon ${["cancel", "reject", "no-show"].includes(pendingAction.action) ? "danger" : "success"}`}
            >
              <AlertTriangle size={21} />
            </div>
            <h3 id="manager-reservation-confirm-title">
              {pendingAction.action === "cancel" ? "Cancel this reservation?" : pendingAction.action === "reject" ? "Reject this reservation?" : pendingAction.action === "no-show" ? "Mark guest as a no-show?" : "Confirm payment received?"}
            </h3>
            <p id="manager-reservation-confirm-description">
              {["cancel", "reject", "no-show"].includes(pendingAction.action)
                ? `This will mark ${pendingAction.item.customer_name}'s reservation as ${pendingAction.action === "no-show" ? "a no-show" : pendingAction.action === "reject" ? "rejected" : "cancelled"}. Any eligible refund follows the existing wallet refund policy.`
                : `This records ₹${(Number(pendingAction.item.fee_amount) + Number(pendingAction.item.preorder_total || 0)).toFixed(2)} received at the desk and confirms the booking for ${pendingAction.item.customer_name}.`}
            </p>
            {["cancel", "reject", "no-show"].includes(pendingAction.action) && <label className="manager-reservation-action-reason">Reason (optional)<textarea value={actionReason} maxLength={500} onChange={(event) => setActionReason(event.target.value)} rows={3} placeholder="Add a note for the reservation record" /></label>}
            <div className="manager-reservation-confirm-actions">
              <button
                type="button"
                className="confirm-dismiss"
                onClick={() => setPendingAction(null)}
                disabled={busyId === pendingAction.item.id}
              >
                Go back
              </button>
              <button
                type="button"
                className={
                  ["cancel", "reject", "no-show"].includes(pendingAction.action)
                    ? "confirm-danger"
                    : "confirm-success"
                }
                onClick={async () => {
                  let succeeded = false;
                  if (pendingAction.action === "cancel") succeeded = await update(pendingAction.item, "cancel", actionReason);
                  else if (pendingAction.action === "reject") succeeded = await updateReservationStatus(pendingAction.item, "REJECTED", actionReason);
                  else if (pendingAction.action === "no-show") succeeded = await updateReservationStatus(pendingAction.item, "NO_SHOW", actionReason);
                  else succeeded = await update(pendingAction.item, pendingAction.action);
                  if (succeeded) setPendingAction(null);
                }}
                disabled={busyId === pendingAction.item.id}
              >
                {busyId === pendingAction.item.id
                  ? "Processing…"
                  : pendingAction.action === "cancel"
                    ? "Cancel reservation"
                    : pendingAction.action === "reject"
                      ? "Reject reservation"
                      : pendingAction.action === "no-show"
                        ? "Mark no-show"
                    : "Confirm payment"}
              </button>
            </div>
          </section>
        </div>
      )}
      {scannerOpen && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-pass-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-pass-title" aria-describedby="reservation-pass-description"><button type="button" className="manager-reservation-confirm-close" onClick={() => setScannerOpen(false)} aria-label="Close scanner"><X size={18}/></button><div className="manager-reservation-confirm-icon success"><QrCode size={21}/></div><h3 id="reservation-pass-title">Verify reservation pass</h3><p id="reservation-pass-description">Scan the customer’s QR pass, upload a pass image, or enter its reservation ID.</p><div className="reservation-camera-stage">{!cameraActive && <div className="reservation-camera-placeholder"><QrCode size={40} aria-hidden="true"/><strong>Scan a reservation QR code</strong><span>Start the camera or upload a clear image of the pass.</span></div>}<video ref={videoRef} className={`reservation-camera-preview${cameraActive ? " active" : ""}`} muted playsInline aria-label="Reservation pass camera preview" /></div><div className="reservation-pass-controls"><button type="button" disabled={cameraActive || scanBusy} onClick={async () => { setScanError(""); scanActiveRef.current = true; try { const detector = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null; const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (!scanActiveRef.current || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } cameraRef.current = stream; videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraActive(true); const canvas = document.createElement("canvas"); const context = canvas.getContext("2d", { willReadFrequently: true }); const scanFrame = async () => { if (!scanActiveRef.current) return; try { let value = ""; if (detector) value = (await detector.detect(videoRef.current))[0]?.rawValue || ""; else if (videoRef.current.videoWidth) { canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight; context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); value = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data || ""; } if (value) { scanActiveRef.current = false; stream.getTracks().forEach((track) => track.stop()); cameraRef.current = null; setCameraActive(false); verifyPass(value); return; } } catch { /* Wait for the next camera frame. */ } window.setTimeout(scanFrame, 450); }; scanFrame(); } catch (e) { scanActiveRef.current = false; cameraRef.current?.getTracks().forEach((track) => track.stop()); cameraRef.current = null; setCameraActive(false); setScanError(e.message || "Camera access failed. Upload the pass image or enter its ID."); } }}><QrCode size={16}/>{cameraActive ? "Camera active" : "Use camera"}</button><label><Upload size={16}/> Upload pass<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(bitmap, 0, 0); const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" }); if (!code?.data) throw new Error("No reservation QR code was found in that image."); await verifyPass(code.data); } catch (e) { setScanError(e.message); } finally { event.target.value = ""; } }}/></label></div><div className="reservation-pass-divider"><span>Or enter the reservation ID</span></div><form onSubmit={(event) => { event.preventDefault(); verifyPass(scanValue); }} className="reservation-pass-id-form"><input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Reservation ID" aria-label="Reservation ID"/><button type="submit" disabled={scanBusy || !scanValue.trim()}>{scanBusy ? "Verifying…" : "Verify ID"}</button></form>{scanError && <div className="reservation-error" role="alert">{scanError}</div>}</section></div>}
      {foodReservation && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-food-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-food-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setFoodReservation(null)} aria-label="Close food editor"><X size={18}/></button><h3 id="reservation-food-title">Add preorder food</h3><p>Add dishes to this reservation before confirming. The updated total will appear in reservation details.</p>{menuBusy ? <p>Loading menu…</p> : availableVariants.length === 0 ? <p>No available menu items right now.</p> : <form onSubmit={addFood} className="reservation-food-form"><label>Menu item<select value={variantId} onChange={(event) => setVariantId(event.target.value)} required><option value="">Choose a dish</option>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.foodName} · {variant.name} — ₹{Number(variant.price).toFixed(2)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="99" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} required/></label><div className="manager-reservation-confirm-actions"><button type="button" className="confirm-dismiss" onClick={() => setFoodReservation(null)}>Cancel</button><button type="submit" className="confirm-success" disabled={!variantId || busyId === foodReservation.id}>{busyId === foodReservation.id ? "Adding…" : "Add to reservation"}</button></div></form>}</section></div>}
      {pendingOrderRemoval && <ConfirmActionDialog
        action="cancel"
        resourceType="manager-added food order"
        resourceName={`Order for ${pendingOrderRemoval.order.customer_name || "this guest"}`}
        title="Remove this order from the kitchen?"
        description="The kitchen will no longer prepare this order. Its record will stay in the visit history."
        confirmLabel="Remove order"
        busy={busyId === pendingOrderRemoval.order.id}
        showReason={false}
        onCancel={() => { if (busyId !== pendingOrderRemoval.order.id) setPendingOrderRemoval(null); }}
        onConfirm={removeManagerAddedOrder}
      />}
      {deskOrderReservation && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-food-dialog" role="dialog" aria-modal="true" aria-labelledby="desk-order-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setDeskOrderReservation(null)} aria-label="Close desk order"><X size={18}/></button><h3 id="desk-order-title">Add food order</h3><p>Choose the dishes and quantities, then review before sending the order to the kitchen. Payment will be due at the desk for {deskOrderReservation.customer_name}.</p>{menuBusy ? <p>Loading menu…</p> : availableVariants.length === 0 ? <p>No available menu items right now.</p> : <form onSubmit={createDeskOrder} className="reservation-food-form"><div className="desk-order-lines">{deskOrderLines.map((line) => <div className="desk-order-line" key={line.key}><label>Dish<select value={line.variant_id} onChange={(event) => setDeskOrderLines((current) => current.map((entry) => entry.key === line.key ? { ...entry, variant_id: event.target.value } : entry))} required><option value="">Choose a dish</option>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.foodName} · {variant.name} — ₹{Number(variant.price).toFixed(2)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="99" value={line.quantity} onChange={(event) => setDeskOrderLines((current) => current.map((entry) => entry.key === line.key ? { ...entry, quantity: event.target.value } : entry))} required/></label>{deskOrderLines.length > 1 && <button type="button" className="desk-order-remove" onClick={() => setDeskOrderLines((current) => current.filter((entry) => entry.key !== line.key))}>Remove item</button>}</div>)}</div><button type="button" className="desk-order-add" disabled={deskOrderLines.length >= 50} onClick={() => setDeskOrderLines((current) => [...current, { key: window.crypto.randomUUID(), variant_id: "", quantity: 1 }])}>Add another dish</button><div className="manager-reservation-confirm-actions"><button type="button" className="confirm-dismiss" onClick={() => setDeskOrderReservation(null)}>Go back</button><button type="submit" className="confirm-success" disabled={deskOrderLines.some((line) => !line.variant_id || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 || Number(line.quantity) > 99) || consolidateDeskOrderLines(deskOrderLines).some((line) => line.quantity > 99) || busyId === deskOrderReservation.id}>{busyId === deskOrderReservation.id ? "Sending…" : "Send order to kitchen"}</button></div></form>}</section></div>}
    </ManagerLayout>
  );
}
