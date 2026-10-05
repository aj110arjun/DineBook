import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Minus, Plus, Users } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { photo } from "../../data/landingData.js";
import "./CustomerReservationPage.css";

const lunchSlots = ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"];
const dinnerSlots = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"];
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function to24Hour(value) {
  const [clock, period] = value.split(" ");
  let [hour, minute] = clock.split(":").map(Number);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function CustomerReservationPage() {
  const { restaurantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(location.state?.date || isoDate(new Date()));
  const [month, setMonth] = useState(() => { const selected = new Date(`${location.state?.date || isoDate(new Date())}T12:00:00`); return new Date(selected.getFullYear(), selected.getMonth(), 1); });
  const [guests, setGuests] = useState(Number(location.state?.guests || 2));
  const [time, setTime] = useState(location.state?.time || "8:00 PM");
  const [availability, setAvailability] = useState({});
  const [availabilityError, setAvailabilityError] = useState("");
  const [step, setStep] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [reservation, setReservation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    requestJson(`/api/customer/restaurants/${restaurantId}`).then((value) => active && setRestaurant(value)).catch((reason) => active && setError(reason.message));
    requestJson("/api/customer/me").then((value) => active && setUser(value)).catch(() => active && navigate("/customer/login", { replace: true }));
    return () => { active = false; };
  }, [restaurantId, navigate]);

  useEffect(() => {
    let active = true;
    setAvailabilityError("");
    setAvailability(Object.fromEntries([...lunchSlots, ...dinnerSlots].map((slot) => [slot, { loading: true, tables: [] }])));
    const lookups = [...lunchSlots, ...dinnerSlots].map(async (slot) => {
      const params = new URLSearchParams({ restaurant_id: restaurantId, reservation_date: date, start_time: to24Hour(slot), number_of_guests: String(guests) });
      try {
        const result = await requestJson(`/api/customer/reservations/availability?${params}`);
        return [slot, { loading: false, tables: result.tables || [] }];
      } catch (reason) {
        return [slot, { loading: false, tables: [], error: reason.message }];
      }
    });
    Promise.all(lookups).then((results) => {
      if (!active) return;
      setAvailability(Object.fromEntries(results));
      const lookupError = results.find(([, value]) => value.error)?.[1]?.error;
      if (lookupError) setAvailabilityError(lookupError);
    });
    return () => { active = false; };
  }, [restaurantId, date, guests]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);
  const selectedAvailability = availability[time] || { loading: true, tables: [] };
  const availableTables = selectedAvailability.tables || [];
  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
  const quotedFee = step === 1 ? Math.min(...(availableTables.length ? availableTables.map((table) => Number(table.reservation_fee)) : [250])) : Number(selectedTable?.reservation_fee || reservation?.fee_amount || 0);
  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);

  function chooseDate(value) {
    setDate(value);
    const chosen = new Date(`${value}T12:00:00`);
    setMonth(new Date(chosen.getFullYear(), chosen.getMonth(), 1));
  }

  function continueToTables() {
    if (!availableTables.length || selectedAvailability.loading) return;
    setSelectedTableId(availableTables[0].id);
    setStep(2);
  }

  async function submitReservation() {
    if (!selectedTable) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestJson("/api/customer/reservations", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: restaurantId, reservation_date: date, start_time: to24Hour(time), number_of_guests: guests, table_id: selectedTable.id }),
      });
      setReservation(result);
      setStep(4);
    } catch (reason) {
      setError(reason.message);
      if (reason.message.toLowerCase().includes("no longer available") || reason.message.toLowerCase().includes("no suitable table")) setStep(1);
    } finally { setBusy(false); }
  }

  const selectedDateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  const restaurantPhoto = restaurant?.images?.[0] || restaurant?.image || photo("photo-1517248135467-4c7edcad34c4", 600);

  return <div className="customer-home"><CustomerHeader user={user} onLogout={() => setUser(null)} />
    <main className="customer-reservation-page">
      <nav className="restaurant-breadcrumbs" aria-label="Breadcrumb"><Link to="/customer">Home</Link><span>/</span><Link to="/customer/restaurants">Restaurants</Link><span>/</span><Link to={`/customer/restaurants/${restaurantId}`}>{restaurant?.name || "Restaurant"}</Link><span>/</span><strong>Booking</strong></nav>
      {error && step === 1 && <p className="reservation-page-error" role="alert">{error}</p>}
      {!restaurant ? <p className="customer-reservation-loading">Loading restaurant…</p> : <>
        <section className="booking-restaurant-summary"><img src={restaurantPhoto} alt={`${restaurant.name} dining room`} /><div><h1>{restaurant.name}</h1><p>{restaurant.cuisine || restaurant.cuisine_type || "Restaurant"} · ₹₹</p><span><MapPin size={14} /> {restaurant.address || restaurant.city}</span></div></section>
        <div className="customer-booking-layout">
          <section className="customer-booking-main">
            {step === 1 && <>
              <section className="booking-calendar-panel"><header><div><span className="booking-step-label">RESERVATION STEP 1 OF 4</span><h2>Select Date</h2></div><div className="booking-month-controls"><button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ArrowLeft size={16} /></button><strong>{monthTitle}</strong><button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ArrowRight size={16} /></button></div></header>
                <div className="booking-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="booking-calendar-weekday" key={day}>{day}</span>)}{calendarDays.map((day) => { const key = isoDate(day); const outside = day.getMonth() !== month.getMonth(); const past = key < isoDate(new Date()); return <button type="button" disabled={outside || past} key={key} className={`${outside ? "outside " : ""}${past ? "past " : ""}${date === key ? "selected" : ""}`} onClick={() => chooseDate(key)}>{day.getDate()}</button>; })}</div>
              </section>
              <section className="booking-guest-panel"><div><h3>Number of Guests</h3><p>For parties larger than 12, please contact the restaurant.</p></div><div className="booking-guest-stepper"><button type="button" aria-label="Remove guest" disabled={guests <= 1} onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><strong>{guests} {guests === 1 ? "Guest" : "Guests"}</strong><button type="button" aria-label="Add guest" disabled={guests >= 12} onClick={() => setGuests((value) => Math.min(12, value + 1))}><Plus size={16} /></button></div></section>
              <section className="booking-slots-panel"><h3>Available Time Slots</h3><h4>LUNCH</h4><div className="booking-slot-row">{lunchSlots.map((slot) => <SlotButton key={slot} slot={slot} selected={time === slot} availability={availability[slot]} onClick={() => setTime(slot)} />)}</div><h4>DINNER</h4><div className="booking-slot-row">{dinnerSlots.map((slot) => <SlotButton key={slot} slot={slot} selected={time === slot} availability={availability[slot]} onClick={() => setTime(slot)} />)}</div>{availabilityError && <p className="reservation-page-error">{availabilityError}</p>}</section>
            </>}

            {step === 2 && <section className="booking-table-panel"><span className="booking-step-label">RESERVATION STEP 2 OF 4</span><h2>Select Your Table</h2><p>Available tables for {selectedDateLabel} at {time} · {guests} guests</p><div className="booking-table-legend"><span>Available</span><span>Selected</span><span>Unavailable</span></div><div className="booking-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={selectedTableId === table.id ? "selected" : ""} onClick={() => setSelectedTableId(table.id)}><span className="booking-table-bullet">{selectedTableId === table.id ? <Check size={15} /> : null}</span><span><strong>Table {table.table_number}</strong><small>{table.floor_name} · {table.capacity} seats · {table.table_type}</small></span><b>₹{Number(table.reservation_fee).toFixed(2)}</b></button>)}</div><button type="button" className="booking-back-button" onClick={() => setStep(1)}>Back to date & time</button></section>}

            {step === 3 && <section className="booking-review-panel"><span className="booking-step-label">RESERVATION STEP 3 OF 4</span><h2>Review Reservation</h2><p>Check your table and booking details before submitting.</p><div className="booking-review-lines"><ReviewLine label="Date" value={selectedDateLabel} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Preferred time" value={time} /><ReviewLine label="Selected table" value={`${selectedTable?.floor_name} · Table ${selectedTable?.table_number}`} /><ReviewLine label="Table booking fee" value={`₹${quotedFee.toFixed(2)}`} bold /></div><div className="booking-payment-note"><strong>Payment required to confirm</strong><p>This reservation will remain pending until the restaurant records that it has received the table booking fee.</p></div><button type="button" className="booking-back-button" onClick={() => setStep(2)}>Change selected table</button></section>}

            {step === 4 && reservation && <section className="booking-result-panel"><span className="booking-step-label">RESERVATION STEP 4 OF 4</span><div className="booking-result-icon">✓</div><h2>Reservation Request Received</h2><p>Your request is saved. The table is held while the restaurant verifies your payment.</p><div className="booking-review-lines"><ReviewLine label="Booking reference" value={reservation.id.slice(0, 8).toUpperCase()} /><ReviewLine label="Date & time" value={`${selectedDateLabel} · ${time}`} /><ReviewLine label="Table" value={`${reservation.tables?.[0]?.floor_name} · Table ${reservation.tables?.[0]?.table_number}`} /><ReviewLine label="Booking fee due" value={`₹${Number(reservation.fee_amount).toFixed(2)}`} bold /><ReviewLine label="Status" value="Payment pending" bold /></div><Link to={`/customer/restaurants/${restaurantId}`} className="booking-back-button">Back to restaurant</Link></section>}
          </section>

          <aside className="booking-summary-column"><section className="booking-summary-card"><span className="booking-step-label">RESERVATION STEP {step} OF 4</span><h2>{step === 1 ? "Booking Summary" : step === 2 ? "Dine-in Details" : step === 3 ? "Reservation Summary" : "Reservation Status"}</h2><div className="booking-summary-lines"><ReviewLine label="Selected date" value={selectedDateLabel} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Preferred time" value={time} />{step >= 2 && <ReviewLine label="Selected table" value={selectedTable ? `Table ${selectedTable.table_number}` : "Choose a table"} />}<ReviewLine label="Table booking charge" value={selectedAvailability.loading && step === 1 ? "Checking…" : `₹${quotedFee.toFixed(2)}`} /><ReviewLine label="Total payable" value={`₹${quotedFee.toFixed(2)}`} bold /></div>{step === 1 && <button type="button" className="booking-primary-action" disabled={selectedAvailability.loading || !availableTables.length} onClick={continueToTables}>{selectedAvailability.loading ? "Checking table availability…" : !availableTables.length ? "No tables available" : "Continue to Table Selection"}</button>}{step === 2 && <button type="button" className="booking-primary-action" disabled={!selectedTable} onClick={() => setStep(3)}>Continue to Review</button>}{step === 3 && <button type="button" className="booking-primary-action" disabled={busy} onClick={submitReservation}>{busy ? "Submitting…" : "Submit Reservation"}</button>}{step === 4 && <Link to="/customer/restaurants" className="booking-primary-action booking-link-action">Explore restaurants</Link>}</section><p className="booking-summary-footnote">The fee is set by the restaurant manager for the selected table. Food and drinks are billed separately at the restaurant.</p>{error && step > 1 && <p className="reservation-page-error" role="alert">{error}</p>}</aside>
        </div>
      </>}
    </main><LandingFooter />
  </div>;
}

function SlotButton({ slot, selected, availability, onClick }) {
  const isLoading = availability?.loading ?? true;
  const isAvailable = (availability?.tables?.length || 0) > 0;
  return <button type="button" disabled={isLoading || !isAvailable} className={`${selected ? "selected" : ""}${!isLoading && !isAvailable ? " unavailable" : ""}`} onClick={onClick}>{slot}{isLoading && <small>Checking</small>}</button>;
}

function ReviewLine({ label, value, bold = false }) {
  return <div className={bold ? "booking-review-line bold" : "booking-review-line"}><span>{label}</span><strong>{value}</strong></div>;
}
