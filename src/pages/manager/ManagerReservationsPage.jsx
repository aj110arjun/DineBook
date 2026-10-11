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
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  const [listPageSize, setListPageSize] = useState(10);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("reservationId") || "");
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
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
    if (scannerOpen) return;
    scanActiveRef.current = false;
    cameraRef.current?.getTracks().forEach((track) => track.stop());
    cameraRef.current = null;
    setCameraActive(false);
  }, [scannerOpen]);

  const load = useCallback(
    () => Promise.all([
      requestJson("/api/manager/reservations"),
      requestJson("/api/auth/manager/me"),
    ])
        .then(([data, manager]) => {
          setItems(data);
          setWorkingDays(Array.isArray(manager.restaurant_hours) ? manager.restaurant_hours : []);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [],
  );
  const realtimeStatus = useRealtimeEvents({ enabled: true, onEvent: load, onReconnect: load });
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!query) return;
    const match = items.find((item) => item.id.replaceAll("-", "").toLowerCase() === query.replaceAll("-", "").toLowerCase());
    if (match) {
      setSelectedDate(match.reservation_date);
      setMonth(new Date(`${match.reservation_date}T12:00:00`));
      setExpandedId(match.id);
    }
  }, [items, query]);

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

  const tables = useMemo(
    () =>
      Array.from(
        new Map(
          items.flatMap((item) =>
            item.tables.map((table) => [table.id, table]),
          ),
        ).values(),
      ),
    [items],
  );
  const reservationIdQuery = query.trim().toLowerCase();
  const idMatches = reservationIdQuery.length >= 6
    ? items.filter((item) => item.id.toLowerCase().replaceAll("-", "").startsWith(reservationIdQuery.replaceAll("-", "")))
    : [];
  const isReservationIdLookup = idMatches.length > 0;
  const selectedItems = useMemo(() => {
    return items.filter((item) => {
      if (!isReservationIdLookup && item.reservation_date !== selectedDate) return false;
      if (tableFilter !== "all" && !item.tables.some((table) => table.id === tableFilter)) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (guestFilter !== "all" && (guestFilter === "6+" ? item.number_of_guests < 6 : item.number_of_guests !== Number(guestFilter))) return false;
      if (isReservationIdLookup) return item.id.toLowerCase().replaceAll("-", "").startsWith(reservationIdQuery.replaceAll("-", ""));
      const haystack = `${item.id} ${item.customer_name} ${item.customer_email || ""} ${item.tables.map((table) => table.table_number).join(" ")}`.toLowerCase();
      return haystack.includes(reservationIdQuery);
    }).sort((left, right) => reservationSort === "guests" ? left.number_of_guests - right.number_of_guests : `${left.start_time || ""}`.localeCompare(`${right.start_time || ""}`));
  }, [items, selectedDate, tableFilter, reservationIdQuery, isReservationIdLookup, statusFilter, guestFilter, reservationSort]);
  const visibleSelectedItems = selectedItems.slice((listPage - 1) * listPageSize, listPage * listPageSize);
  useEffect(() => { setListPage(1); }, [selectedDate, tableFilter, query, statusFilter, guestFilter, reservationSort, listPageSize]);
  useEffect(() => { setListPage((current) => Math.min(current, Math.max(1, Math.ceil(selectedItems.length / listPageSize)))); }, [selectedItems.length, listPageSize]);
  const dayGuestCount = selectedItems.reduce(
    (total, item) => total + item.number_of_guests,
    0,
  );

  async function update(item, action, reason = "") {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/${action}`, {
        method: "POST",
        ...(action === "cancel" ? { body: JSON.stringify({ reason: reason.trim() || null }) } : {}),
      });
      await load();
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
      await load();
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
      setItems((current) => [reservation, ...current.filter((entry) => entry.id !== reservation.id)]);
      setQuery(reservation.id);
      setSelectedDate(reservation.reservation_date);
      const date = new Date(`${reservation.reservation_date}T12:00:00`);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setExpandedId(reservation.id);
      setScannerOpen(false);
      setScanValue("");
    } catch (e) {
      setScanError(e.message || "Could not verify this pass for your restaurant.");
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
      const updated = await requestJson(`/api/manager/reservations/${foodReservation.id}/preorder-items`, {
        method: "POST",
        body: JSON.stringify({ variant_id: variantId, quantity: Number(foodQuantity) }),
      });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
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

  async function queueExistingPreorder(item) {
    setBusyId(item.id);
    try {
      const order = await requestJson(`/api/manager/reservations/${item.id}/preorder-order`, { method: "POST" });
      setReservationOrders((current) => ({
        ...current,
        [item.id]: [...(current[item.id] || []).filter((entry) => entry.id !== order.id), order],
      }));
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
      const updated = await requestJson(`/api/manager/reservations/${item.id}/confirm-preorder-payment`, { method: "POST" });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
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
              Home <span>/</span> <strong>Reservations</strong>
            </div>
            <h2>Reservations Calendar</h2>
            <p>View and manage all table reservations · {realtimeStatus === "connected" ? "Live updates connected" : realtimeStatus === "reconnecting" ? "Reconnecting to live updates…" : realtimeStatus === "disconnected" ? "Live updates disconnected · Refresh to sync" : "Connecting to live updates…"}</p>
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
            <select aria-label="Filter by reservation status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select aria-label="Filter by party size" value={guestFilter} onChange={(event) => setGuestFilter(event.target.value)}><option value="all">All party sizes</option>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={String(count)}>{count} guests</option>)}<option value="6+">6+ guests</option></select>
            <select aria-label="Sort reservations" value={reservationSort} onChange={(event) => setReservationSort(event.target.value)}><option value="time">Time: earliest first</option><option value="guests">Party size: smallest first</option></select>
            <div className="reservation-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reservation ID, guests, tables…"
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
                  const dayItems = items.filter(
                    (item) => item.reservation_date === key,
                  );
                  const currentMonth = day.getMonth() === month.getMonth();
                  const schedule = workingDays?.find((entry) =>
                    String(entry.day_of_week).toLowerCase() === day.toLocaleDateString("en", { weekday: "long" }).toLowerCase(),
                  );
                  const workingDay = workingDays === null
                    ? false
                    : workingDays.length === 0 || Boolean(schedule?.enabled && schedule.open_time && schedule.close_time);
                  const disabled = !currentMonth || !workingDay;
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
                      {dayItems.length > 0 && (
                        <span className="reservation-day-count">
                          {dayItems.length}
                        </span>
                      )}
                      <span className="reservation-day-dots">
                        {[
                          ...new Set(
                            dayItems.map(
                              (item) => statusClass[item.status] || "pending",
                            ),
                          ),
                        ].map((tone) => (
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
              <h3>{isReservationIdLookup ? "Reservation ID lookup" : `Reservations – ${selectedLabel}`}</h3>
              <span className="booking-count">
                {selectedItems.length} Bookings
              </span>
              <span className="guest-count">{dayGuestCount} Guests</span>
            </header>
            <div className="reservation-list-scroll">
              {selectedItems.length === 0 ? (
                <div className="reservation-empty">
                  <CalendarDays size={28} />
                  <strong>No reservations on this date</strong>
                  <span>
                    Choose another date or adjust the table or search filters.
                  </span>
                </div>
              ) : (
                visibleSelectedItems.map((item) => (
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
                          <strong>Kitchen orders</strong>
                          {ordersLoadingId === item.id ? <span>Loading orders…</span> : (reservationOrders[item.id] || []).length === 0 ? <span>No kitchen orders yet.</span> : (reservationOrders[item.id] || []).map((order) => (
                            <div className="reservation-linked-order" key={order.id}>
                              <span><Link to={`/manager/orders/${order.id}`}>{order.is_preorder ? "Preorder" : "Desk order"} #{order.id.slice(0, 8).toUpperCase()}</Link> · {order.status}{order.items?.length ? ` · ${order.items.map((food) => `${food.quantity} × ${food.food_name}`).join(", ")}` : ""}</span>
                              <strong>₹{Number(order.total).toFixed(2)} · {order.payment_status === "PAID" ? "Paid" : "Due at desk"}</strong>
                            </div>
                          ))}
                          {item.status === "SEATED" && item.fulfillment_type === "PREORDER" && item.preorder_items?.length > 0 && !(reservationOrders[item.id] || []).some((order) => order.is_preorder) && <button type="button" disabled={busyId === item.id || ordersLoadingId === item.id} onClick={() => queueExistingPreorder(item)}>{busyId === item.id ? "Sending…" : "Send existing preorder to kitchen"}</button>}
                          {item.status === "SEATED" && <button type="button" onClick={() => openDeskOrder(item)}>Order at desk</button>}
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
                ))
              )}
              {selectedItems.length > 0 && <Pagination page={listPage} pageSize={listPageSize} total={selectedItems.length} onPageChange={setListPage} onPageSizeChange={setListPageSize} pageSizes={[5, 10, 20]} label="reservations" />}
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
      {scannerOpen && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-pass-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-pass-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setScannerOpen(false)} aria-label="Close scanner"><X size={18}/></button><div className="manager-reservation-confirm-icon success"><QrCode size={21}/></div><h3 id="reservation-pass-title">Verify reservation pass</h3><p>Scan the customer’s QR pass, upload a pass image, or enter its reservation ID.</p><video ref={videoRef} className={`reservation-camera-preview${cameraActive ? " active" : ""}`} muted playsInline /> <div className="reservation-pass-controls"><button type="button" onClick={async () => { setScanError(""); try { const detector = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null; const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); cameraRef.current = stream; scanActiveRef.current = true; videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraActive(true); const canvas = document.createElement("canvas"); const context = canvas.getContext("2d", { willReadFrequently: true }); const scanFrame = async () => { if (!scanActiveRef.current) return; try { let value = ""; if (detector) value = (await detector.detect(videoRef.current))[0]?.rawValue || ""; else if (videoRef.current.videoWidth) { canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight; context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); value = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data || ""; } if (value) { scanActiveRef.current = false; stream.getTracks().forEach((track) => track.stop()); cameraRef.current = null; setCameraActive(false); verifyPass(value); return; } } catch { /* Wait for the next camera frame. */ } window.setTimeout(scanFrame, 450); }; scanFrame(); } catch (e) { setScanError(e.message || "Camera access failed. Upload the pass image or enter its ID."); } }}><QrCode size={16}/> Use camera</button><label><Upload size={16}/> Upload pass<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(bitmap, 0, 0); const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" }); if (!code?.data) throw new Error("No reservation QR code was found in that image."); await verifyPass(code.data); } catch (e) { setScanError(e.message); } finally { event.target.value = ""; } }}/></label></div><form onSubmit={(event) => { event.preventDefault(); verifyPass(scanValue); }} className="reservation-pass-id-form"><input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Reservation ID" aria-label="Reservation ID"/><button type="submit" disabled={scanBusy || !scanValue.trim()}>{scanBusy ? "Verifying…" : "Verify ID"}</button></form>{scanError && <div className="reservation-error" role="alert">{scanError}</div>}</section></div>}
      {foodReservation && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-food-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-food-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setFoodReservation(null)} aria-label="Close food editor"><X size={18}/></button><h3 id="reservation-food-title">Add preorder food</h3><p>Add dishes to this reservation before confirming. The updated total will appear in reservation details.</p>{menuBusy ? <p>Loading menu…</p> : availableVariants.length === 0 ? <p>No available menu items right now.</p> : <form onSubmit={addFood} className="reservation-food-form"><label>Menu item<select value={variantId} onChange={(event) => setVariantId(event.target.value)} required><option value="">Choose a dish</option>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.foodName} · {variant.name} — ₹{Number(variant.price).toFixed(2)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="99" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} required/></label><div className="manager-reservation-confirm-actions"><button type="button" className="confirm-dismiss" onClick={() => setFoodReservation(null)}>Cancel</button><button type="submit" className="confirm-success" disabled={!variantId || busyId === foodReservation.id}>{busyId === foodReservation.id ? "Adding…" : "Add to reservation"}</button></div></form>}</section></div>}
      {deskOrderReservation && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-food-dialog" role="dialog" aria-modal="true" aria-labelledby="desk-order-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setDeskOrderReservation(null)} aria-label="Close desk order"><X size={18}/></button><h3 id="desk-order-title">Order at desk</h3><p>Create another order for {deskOrderReservation.customer_name}. It will appear in the Chef kitchen queue and be payable at the desk.</p>{menuBusy ? <p>Loading menu…</p> : availableVariants.length === 0 ? <p>No available menu items right now.</p> : <form onSubmit={createDeskOrder} className="reservation-food-form"><div className="desk-order-lines">{deskOrderLines.map((line) => <div className="desk-order-line" key={line.key}><label>Menu item<select value={line.variant_id} onChange={(event) => setDeskOrderLines((current) => current.map((entry) => entry.key === line.key ? { ...entry, variant_id: event.target.value } : entry))} required><option value="">Choose a dish</option>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.foodName} · {variant.name} — ₹{Number(variant.price).toFixed(2)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="99" value={line.quantity} onChange={(event) => setDeskOrderLines((current) => current.map((entry) => entry.key === line.key ? { ...entry, quantity: event.target.value } : entry))} required/></label>{deskOrderLines.length > 1 && <button type="button" className="desk-order-remove" onClick={() => setDeskOrderLines((current) => current.filter((entry) => entry.key !== line.key))}>Remove item</button>}</div>)}</div><button type="button" className="desk-order-add" disabled={deskOrderLines.length >= 50} onClick={() => setDeskOrderLines((current) => [...current, { key: window.crypto.randomUUID(), variant_id: "", quantity: 1 }])}>Add another item</button><div className="manager-reservation-confirm-actions"><button type="button" className="confirm-dismiss" onClick={() => setDeskOrderReservation(null)}>Cancel</button><button type="submit" className="confirm-success" disabled={deskOrderLines.some((line) => !line.variant_id || !Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1 || Number(line.quantity) > 99) || consolidateDeskOrderLines(deskOrderLines).some((line) => line.quantity > 99) || busyId === deskOrderReservation.id}>{busyId === deskOrderReservation.id ? "Creating…" : "Create order"}</button></div></form>}</section></div>}
    </ManagerLayout>
  );
}
