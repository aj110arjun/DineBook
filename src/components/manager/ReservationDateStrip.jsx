import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../../assets/css/ReservationDateStrip.css";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function ReservationDateStrip({ month, selectedDate, calendarDays, workingDays = null, onSelect, onMonthChange, onToday, label = "Reservation calendar", activityLabel = "activity", activityPluralLabel = "activities" }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const days = useMemo(() => Array.from(
    { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  ), [month]);
  const today = dateKey(new Date());
  const monthLabel = month.toLocaleDateString("en", { month: "long", year: "numeric" });

  function updateEdges() {
    const track = trackRef.current;
    if (track) setEdges({ start: track.scrollLeft < 2, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 });
  }

  useEffect(() => {
    const track = trackRef.current;
    const active = track?.querySelector('[aria-pressed="true"]');
    if (active) track.scrollLeft = active.offsetLeft - (track.clientWidth - active.clientWidth) / 2;
    else if (track) track.scrollLeft = 0;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    if (track) observer.observe(track);
    return () => observer.disconnect();
  }, [selectedDate, month]);

  function scrollDates(direction) {
    const track = trackRef.current;
    track?.scrollBy({ left: direction * Math.max(100, track.clientWidth * 0.75), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section className="reservation-date-strip" aria-label={label}>
      <header className="reservation-date-strip-heading">
        <div>
          <span className="reservation-eyebrow">PLAN YOUR SERVICE</span>
          <h3>{monthLabel}</h3>
        </div>
        <div className="reservation-date-navigation">
          <button type="button" onClick={onToday} className="reservation-today-button">Today</button>
          <div className="reservation-month-navigation">
            <button type="button" onClick={() => onMonthChange(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
            <span>Month</span>
            <button type="button" onClick={() => onMonthChange(1)} aria-label="Next month"><ChevronRight size={17} /></button>
          </div>
        </div>
      </header>
      <div className="reservation-date-strip-body">
        <div className="reservation-month-tile" aria-hidden="true">
          <span>{month.toLocaleDateString("en", { month: "short" })}</span>
          <strong>{month.getFullYear()}</strong>
        </div>
        <button type="button" className="reservation-date-scroll" aria-label="Scroll to earlier dates" disabled={edges.start} onClick={() => scrollDates(-1)}><ChevronLeft size={19} /></button>
        <div className="reservation-date-track" ref={trackRef} onScroll={updateEdges} role="group" aria-label={`Dates in ${monthLabel}`}>
          {days.map((day) => {
            const key = dateKey(day);
            const summary = calendarDays[key] || {};
            const count = (summary.reservations_count || 0) + (summary.orders_count || 0);
            const countLabel = `${count} ${count === 1 ? activityLabel : activityPluralLabel}`;
            const schedule = workingDays?.find((entry) => String(entry.day_of_week).toLowerCase() === day.toLocaleDateString("en", { weekday: "long" }).toLowerCase());
            const closed = workingDays !== null && workingDays.length > 0 && !(schedule?.enabled && schedule.open_time && schedule.close_time);
            const label = day.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
            return (
              <button type="button" key={key} data-date={key} className={`reservation-date-tile${key === selectedDate ? " selected" : ""}${closed ? " closed" : ""}`} aria-label={`${label}${key === today ? ", today" : ""}${closed ? ", restaurant closed" : ""}, ${countLabel}`} aria-pressed={key === selectedDate} aria-current={key === today ? "date" : undefined} onClick={() => onSelect(key)}>
                <span>{day.toLocaleDateString("en", { weekday: "short" })}</span>
                <strong>{String(day.getDate()).padStart(2, "0")}</strong>
                <small>{count > 0 ? countLabel : closed ? "Closed" : key === today ? "Today" : "No activity"}</small>
              </button>
            );
          })}
        </div>
        <button type="button" className="reservation-date-scroll" aria-label="Scroll to later dates" disabled={edges.end} onClick={() => scrollDates(1)}><ChevronRight size={19} /></button>
      </div>
    </section>
  );
}
