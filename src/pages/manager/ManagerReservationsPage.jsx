import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Users,
  X,
} from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerReservationsPage.css";

const statusClass = {
  CONFIRMED: "confirmed",
  PENDING_PAYMENT: "pending",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  SEATED: "confirmed",
};
const statusLabel = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Payment due",
  CANCELLED: "Cancelled",
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

export default function ManagerReservationsPage() {
  const [items, setItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tableFilter, setTableFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const load = useCallback(
    () =>
      requestJson("/api/manager/reservations")
        .then((data) => {
          setItems(data);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

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
  const selectedItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.reservation_date !== selectedDate) return false;
        if (
          tableFilter !== "all" &&
          !item.tables.some((table) => table.id === tableFilter)
        )
          return false;
        const haystack =
          `${item.customer_name} ${item.customer_email || ""} ${item.tables.map((table) => table.table_number).join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [items, selectedDate, tableFilter, query],
  );
  const dayGuestCount = selectedItems.reduce(
    (total, item) => total + item.number_of_guests,
    0,
  );

  async function update(item, action) {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/${action}`, {
        method: "POST",
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

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
            <p>View and manage all table reservations</p>
          </div>
          <div className="reservation-toolbar">
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
            <div className="reservation-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search guests, tables…"
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
                  const selected = key === selectedDate;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`reservation-calendar-day${currentMonth ? "" : " outside"}${selected ? " selected" : ""}${key === dayKey(new Date()) ? " today" : ""}`}
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
              <h3>Reservations – {selectedLabel}</h3>
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
                selectedItems.map((item) => (
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
                          setExpandedId(expandedId === item.id ? "" : item.id)
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
                        <span>
                          {item.tables
                            .map(
                              (table) =>
                                `${table.floor_name} · Table ${table.table_number}`,
                            )
                            .join(", ")}
                        </span>
                        <strong>
                          Reservation fee ₹{Number(item.fee_amount).toFixed(2)}{" "}
                          · {item.payment_status}
                        </strong>
                        {item.special_request && <p>{item.special_request}</p>}
                        {item.status === "PENDING_PAYMENT" && (
                          <div>
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
                              onClick={() =>
                                setPendingAction({ item, action: "cancel" })
                              }
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
      {pendingAction && (
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
              className={`manager-reservation-confirm-icon ${pendingAction.action === "cancel" ? "danger" : "success"}`}
            >
              <AlertTriangle size={21} />
            </div>
            <h3 id="manager-reservation-confirm-title">
              {pendingAction.action === "cancel"
                ? "Cancel this reservation?"
                : "Confirm payment received?"}
            </h3>
            <p id="manager-reservation-confirm-description">
              {pendingAction.action === "cancel"
                ? `This will cancel ${pendingAction.item.customer_name}'s reservation and release its table.`
                : `This records the ₹${Number(pendingAction.item.fee_amount).toFixed(2)} reservation fee as paid and confirms the booking for ${pendingAction.item.customer_name}.`}
            </p>
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
                  pendingAction.action === "cancel"
                    ? "confirm-danger"
                    : "confirm-success"
                }
                onClick={async () => {
                  await update(pendingAction.item, pendingAction.action);
                  setPendingAction(null);
                }}
                disabled={busyId === pendingAction.item.id}
              >
                {busyId === pendingAction.item.id
                  ? "Processing…"
                  : pendingAction.action === "cancel"
                    ? "Cancel reservation"
                    : "Confirm payment"}
              </button>
            </div>
          </section>
        </div>
      )}
    </ManagerLayout>
  );
}
