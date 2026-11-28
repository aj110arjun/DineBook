import { formatLocalDate, formatWallTime } from "../lib/localDate.js";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomDatePicker from "./CustomDatePicker.jsx";
import CustomGuestPicker from "./CustomGuestPicker.jsx";
import CustomTimePicker from "./CustomTimePicker.jsx";
import CustomForm from "./forms/CustomForm.jsx";
import "../assets/css/RestaurantBookingDock.css";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function RestaurantBookingDock({
  restaurant,
  open,
  onOpenChange,
  eligibility,
  eligibilityLoading = false,
  eligibilityError = "",
}) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const dockRef = useRef(null);
  const [date, setDate] = useState(today);
  const [guests, setGuests] = useState("2");
  const [time, setTime] = useState("20:00");
  const retryTimestamp = eligibility?.retry_at
    ? Date.parse(eligibility.retry_at)
    : Number.NaN;
  const reservationBlocked = eligibility?.can_reserve === false;
  const retryAtLabel = Number.isFinite(retryTimestamp)
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(retryTimestamp))
    : null;

  useEffect(() => {
    const dock = dockRef.current;
    const root = document.documentElement;
    const property = "--restaurant-booking-dock-height";
    const previous = root.style.getPropertyValue(property);
    const measure = () => {
      const height = `${Math.ceil(dock.getBoundingClientRect().height)}px`;
      if (root.style.getPropertyValue(property) !== height) root.style.setProperty(property, height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      if (previous) root.style.setProperty(property, previous);
      else root.style.removeProperty(property);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open) {
      if (dialog.open) dialog.close();
      return undefined;
    }
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const dateLabel = formatLocalDate(date);
  const timeLabel = formatWallTime(time);
  const bookingStatusMessage = reservationBlocked
    ? `You can't reserve a table until ${retryAtLabel || "the cooldown ends"} IST after a recent no-show.${eligibilityError ? " Reload the page if this time has passed." : ""}`
    : eligibilityLoading
      ? "Checking whether you can reserve a table..."
      : eligibilityError ||
        `${dateLabel} · ${guests} ${Number(guests) === 1 ? "guest" : "guests"} · ${timeLabel}`;

  return (
    <>
      <aside
        ref={dockRef}
        className={`restaurant-booking-dock${reservationBlocked ? " is-blocked" : ""}`}
        aria-label="Table reservation"
      >
        <span className="restaurant-booking-dock-icon" aria-hidden="true">
          <CalendarDays size={22} />
        </span>
        <div className="restaurant-booking-dock-copy" role="status" aria-live="polite">
          <strong>
            {reservationBlocked
              ? "Reservations unavailable"
              : eligibilityLoading
                ? "Checking reservation status"
                : "Secure a Table"}
          </strong>
          <span className={eligibilityError ? "reservation-status-error" : ""}>
            {bookingStatusMessage}
          </span>
        </div>
        <button
          type="button"
          className="restaurant-booking-dock-action"
          aria-haspopup="dialog"
          aria-controls="restaurant-booking-dialog"
          aria-expanded={open}
          disabled={reservationBlocked || eligibilityLoading}
          onClick={() => onOpenChange(true)}
        >
          {reservationBlocked
            ? "Unavailable"
            : eligibilityLoading
              ? "Checking..."
              : "Reserve a Table"}
        </button>
      </aside>

      <dialog
        ref={dialogRef}
        id="restaurant-booking-dialog"
        className="restaurant-booking-dialog"
        aria-labelledby="restaurant-booking-title"
        aria-describedby="restaurant-booking-description"
        onKeyDownCapture={(event) => {
          // Let Escape dismiss an open picker before dismissing the panel.
          if (event.key === "Escape" && dialogRef.current.querySelector(".is-open")) {
            event.preventDefault();
          }
        }}
        onClose={() => onOpenChange(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            onOpenChange(false);
          }
        }}
      >
        <header className="restaurant-booking-dialog-heading">
          <div>
            <p className="restaurant-booking-kicker">SECURE A TABLE</p>
            <h2 id="restaurant-booking-title">Reserve a table</h2>
          </div>
          <button
            type="button"
            className="restaurant-booking-close"
            aria-label="Close reservation form"
            onClick={() => onOpenChange(false)}
          >
            <X size={20} />
          </button>
        </header>
        <p className="restaurant-booking-restaurant">{restaurant.name}</p>
        <p id="restaurant-booking-description" className="restaurant-booking-description">
          Choose your date, guests, and preferred time.
        </p>
        <CustomForm onSubmit={(event) => {
          event.preventDefault();
          onOpenChange(false);
          navigate(`/customer/restaurants/${restaurant.id}/booking`, {
            state: { date, guests, time },
          });
        }}>
          <label htmlFor="booking-date">Select date</label>
          <CustomDatePicker
            id="booking-date"
            label="Reservation date"
            value={date}
            minDate={today()}
            required
            onChange={setDate}
          />
          <label htmlFor="booking-guests">Guests</label>
          <CustomGuestPicker id="booking-guests" max={16} value={guests} onChange={setGuests} />
          <label htmlFor="booking-time">Preferred time</label>
          <CustomTimePicker id="booking-time" label="Preferred reservation time" value={time} onChange={setTime} />
          <button className="restaurant-booking-dock-action restaurant-booking-continue" type="submit">
            Check availability
          </button>
          <p className="restaurant-booking-description restaurant-booking-next">
            Next, choose an available table and review your reservation.
          </p>
        </CustomForm>
      </dialog>
    </>
  );
}
