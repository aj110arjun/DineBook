import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function CustomDatePicker({ id, value, onChange, label = "Choose date" }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const formattedDate = value
    ? new Intl.DateTimeFormat("en", { weekday: "short", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`))
    : "Select a date";
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return <div className={`custom-date-picker${open ? " is-open" : ""}`} ref={rootRef}>
    <button id={id} type="button" className="custom-date-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{formattedDate}</span><CalendarDays size={17} aria-hidden="true" />
    </button>
    {open && <div className="custom-date-popover" role="dialog" aria-label={label}>
      <header className="custom-date-header">
        <button type="button" aria-label="Previous month" disabled={month <= currentMonthStart} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
        <strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}</strong>
        <button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
      </header>
      <div className="custom-date-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}
        {days.map((day) => {
          const key = dateKey(day);
          const outsideMonth = day.getMonth() !== month.getMonth();
          const disabled = key < todayKey();
          return <button type="button" key={key} disabled={disabled} className={`${outsideMonth ? "outside-month " : ""}${value === key ? "selected" : ""}`} aria-pressed={value === key} onClick={() => { onChange(key); setOpen(false); }}>
            {day.getDate()}
          </button>;
        })}
      </div>
    </div>}
  </div>;
}
