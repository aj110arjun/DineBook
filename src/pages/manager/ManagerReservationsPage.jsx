import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerReservationsPage.css";

const statusClass = { CONFIRMED: "confirmed", PENDING_PAYMENT: "pending", CANCELLED: "cancelled", COMPLETED: "completed", SEATED: "confirmed" };
const statusLabel = { CONFIRMED: "Confirmed", PENDING_PAYMENT: "Payment due", CANCELLED: "Cancelled", COMPLETED: "Completed", SEATED: "Seated" };
const baseSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
const blockingStatuses = new Set(["PENDING_PAYMENT", "CONFIRMED", "SEATED"]);
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortTime = (value) => {
  if (!value) return "";
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};
const minuteOfDay = (value) => { const [hour, minute] = value.slice(0, 5).split(":").map(Number); return hour * 60 + minute; };
const slotText = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const timeSlotCaption = (reservations, hasPending) => {
  const tableNames = [...new Set(reservations.flatMap((item) => item.tables.map((table) => table.table_number)))];
  const tableLabel = tableNames.length === 1 ? `Table ${tableNames[0]}` : `${tableNames.length} tables`;
  return `${tableLabel} ${hasPending ? "payment due" : "reserved"}`;
};

export default function ManagerReservationsPage() {
  const [items, setItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [tableFilter, setTableFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => requestJson("/api/manager/reservations")
    .then((data) => { setItems(data); setError(""); })
    .catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const monthCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);

  const tables = useMemo(() => Array.from(new Map(items.flatMap((item) => item.tables.map((table) => [table.id, table]))).values()), [items]);
  const selectedItems = useMemo(() => items.filter((item) => {
    if (item.reservation_date !== selectedDate) return false;
    const slotMinute = minuteOfDay(selectedTime);
    const startsAt = minuteOfDay(item.start_time);
    const endsAt = minuteOfDay(item.end_time);
    const occupiesSlot = blockingStatuses.has(item.status)
      ? startsAt <= slotMinute && slotMinute < endsAt
      : startsAt === slotMinute;
    if (!occupiesSlot) return false;
    if (tableFilter !== "all" && !item.tables.some((table) => table.id === tableFilter)) return false;
    const haystack = `${item.customer_name} ${item.customer_email || ""} ${item.tables.map((table) => table.table_number).join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [items, selectedDate, selectedTime, tableFilter, query]);
  const dateReservations = items.filter((item) => item.reservation_date === selectedDate);
  const reservationSlots = dateReservations.flatMap((item) => {
    const start = minuteOfDay(item.start_time);
    if (!blockingStatuses.has(item.status)) return [item.start_time.slice(0, 5)];
    const end = minuteOfDay(item.end_time);
    const occupied = [];
    for (let minute = start; minute < end; minute += 30) occupied.push(slotText(minute));
    return occupied;
  });
  const slots = [...new Set([...baseSlots, ...reservationSlots])].sort();
  const dayGuestCount = selectedItems.reduce((total, item) => total + item.number_of_guests, 0);

  async function update(item, action) {
    setBusyId(item.id);
    try {
      await requestJson(`/api/manager/reservations/${item.id}/${action}`, { method: "POST" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyId(""); }
  }

  function moveMonth(direction) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
  const selectedLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`));

  return <ManagerLayout title="Reservation Management">
    <main className="manager-dashboard-content reservation-page">
      <div className="reservation-page-heading">
        <div><div className="reservation-breadcrumb">Home <span>/</span> <strong>Reservations</strong></div><h2>Reservations Calendar</h2><p>View and manage all table reservations</p></div>
        <div className="reservation-toolbar">
          <label className="reservation-date-control"><CalendarDays size={17} /><span>Date:</span><input aria-label="Selected reservation date" type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); const value = new Date(`${event.target.value}T12:00:00`); setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); }} /></label>
          <select aria-label="Filter by table" value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}><option value="all">Filter by Table: All</option>{tables.map((table) => <option key={table.id} value={table.id}>Table {table.table_number}</option>)}</select>
          <div className="reservation-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests, tables…" /></div>
        </div>
      </div>

      {error && <div className="reservation-error" role="alert">{error}</div>}
      <div className="reservation-workspace">
        <div className="reservation-primary-column">
          <section className="reservation-calendar-card">
            <div className="reservation-legend"><span><i className="confirmed" />Confirmed</span><span><i className="pending" />Payment due</span><span><i className="cancelled" />Cancelled</span><span><i className="completed" />Completed</span></div>
            <div className="reservation-calendar-header"><h3>{monthTitle}</h3><div><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft /></button><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight /></button></div></div>
            <div className="reservation-calendar-grid">{weekDays.map((day) => <div className="reservation-weekday" key={day}>{day}</div>)}{monthCells.map((day) => {
              const key = dayKey(day);
              const dayItems = items.filter((item) => item.reservation_date === key);
              const currentMonth = day.getMonth() === month.getMonth();
              const selected = key === selectedDate;
              return <button type="button" key={key} onClick={() => setSelectedDate(key)} className={`reservation-calendar-day${currentMonth ? "" : " outside"}${selected ? " selected" : ""}${key === dayKey(new Date()) ? " today" : ""}`}>
                <span className="reservation-day-number">{day.getDate()}</span>{dayItems.length > 0 && <span className="reservation-day-count">{dayItems.length}</span>}
                <span className="reservation-day-dots">{[...new Set(dayItems.map((item) => statusClass[item.status] || "pending"))].map((tone) => <i className={tone} key={tone} />)}</span>
              </button>;
            })}</div>
          </section>
          <section className="reservation-slots-card"><h3>Time Slots – {selectedLabel}</h3><div className="reservation-time-slots">{slots.map((slot) => { const slotMinute = minuteOfDay(slot); const occupying = dateReservations.filter((item) => blockingStatuses.has(item.status) && minuteOfDay(item.start_time) <= slotMinute && slotMinute < minuteOfDay(item.end_time)); const pending = occupying.some((item) => item.status === "PENDING_PAYMENT"); return <button type="button" key={slot} title={occupying.length ? occupying.map((item) => `${item.customer_name} · ${item.status.replaceAll("_", " ")}`).join("; ") : "No active reservations"} className={`${slot === selectedTime ? "active " : ""}${occupying.length ? "has-reservations" : ""}${pending ? "has-pending" : ""}`} onClick={() => setSelectedTime(slot)}><span>{shortTime(slot)}</span>{occupying.length > 0 && <small>{timeSlotCaption(occupying, pending)}</small>}</button>; })}</div><p>Showing {selectedItems.length} reservation{selectedItems.length === 1 ? "" : "s"} occupying {shortTime(selectedTime)}</p></section>
        </div>

        <aside className="reservation-list-column">
          <header className="reservation-list-summary"><h3>Reservations – {shortTime(selectedTime)}</h3><span className="booking-count">{selectedItems.length} Bookings</span><span className="guest-count">{dayGuestCount} Guests</span></header>
          <div className="reservation-list-scroll">
            {selectedItems.length === 0 ? <div className="reservation-empty"><CalendarDays size={28} /><strong>No reservations at this time</strong><span>Choose another date or time slot.</span></div> : selectedItems.map((item) => <article className={`reservation-guest-card${expandedId === item.id ? " expanded" : ""}`} key={item.id}>
              <div className="reservation-guest-top"><div className="reservation-avatar">{item.customer_name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="reservation-guest-name"><strong>{item.customer_name}</strong><span>{item.customer_email || "Customer"}</span></div><button className="reservation-expand" type="button" aria-label="Show reservation details" onClick={() => setExpandedId(expandedId === item.id ? "" : item.id)}><ChevronRight size={17} /></button></div>
              <div className="reservation-guest-meta"><span><Users size={14} />{item.number_of_guests} Guests</span><span><CalendarDays size={14} />{item.tables.map((table) => `Table ${table.table_number}`).join(", ")}</span><span className={`reservation-status ${statusClass[item.status] || "pending"}`}>{statusLabel[item.status] || item.status}</span></div>
              {expandedId === item.id && <div className="reservation-expanded-details"><span>{item.tables.map((table) => `${table.floor_name} · Table ${table.table_number}`).join(", ")}</span><strong>Reservation fee ₹{Number(item.fee_amount).toFixed(2)} · {item.payment_status}</strong>{item.special_request && <p>{item.special_request}</p>}{item.status === "PENDING_PAYMENT" && <div><button type="button" disabled={busyId === item.id} onClick={() => update(item, "confirm-payment")}>Record payment & confirm</button><button type="button" disabled={busyId === item.id} onClick={() => update(item, "cancel")}>Cancel</button></div>}</div>}
            </article>)}
          </div>
        </aside>
      </div>
    </main>
  </ManagerLayout>;
}
