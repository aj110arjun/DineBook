import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Minus, Plus, Users } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { photo } from "../../data/landingData.js";
import { saveReservation } from "../../data/customerReservations.js";
import "./CustomerReservationPage.css";

const lunchSlots = ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"];
const dinnerSlots = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"];
const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function to24Hour(value) {
  const [clock, period] = value.split(" ");
  let [hour, minute] = clock.split(":").map(Number);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function shortTime(value) {
  if (!value) return "—";
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}
function makePassImage(qrData, reservation, restaurant) {
  return new Promise((resolve, reject) => {
    const qr = new Image();
    qr.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 860;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.fillStyle = "#f8f4ef";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(28, 28, 584, 804, 20);
        ctx.fill();
        ctx.fillStyle = "#4f101d";
        ctx.beginPath();
        ctx.roundRect(28, 28, 584, 112, 20);
        ctx.fill();
        ctx.fillRect(28, 112, 584, 28);
        ctx.fillStyle = "#d7b96c";
        ctx.font = "700 17px Arial, sans-serif";
        ctx.fillText("DINEBOOK", 58, 72);
        ctx.font = "700 12px Arial, sans-serif";
        ctx.fillText("RESERVATION PASS", 58, 104);
        ctx.textAlign = "right";
        ctx.fillStyle = reservation.status === "CONFIRMED" ? "#b4e5bf" : "#ffdfa1";
        ctx.fillText(reservation.status === "CONFIRMED" ? "CONFIRMED" : "PAYMENT PENDING", 580, 78);
        ctx.textAlign = "center";
        ctx.fillStyle = "#342825";
        ctx.font = "700 23px Arial, sans-serif";
        ctx.fillText(reservation.customer_name || "Guest", 320, 184);
        ctx.font = "16px Arial, sans-serif";
        ctx.fillStyle = "#776b65";
        ctx.fillText(restaurant?.name || "Restaurant", 320, 211);
        const qrSize = 270;
        ctx.drawImage(qr, (canvas.width - qrSize) / 2, 237, qrSize, qrSize);
        const drawRow = (label, value, y, bold = false) => {
          ctx.textAlign = "left";
          ctx.fillStyle = "#938781";
          ctx.font = "13px Arial, sans-serif";
          ctx.fillText(label, 65, y);
          ctx.textAlign = "right";
          ctx.fillStyle = "#382d2a";
          ctx.font = `${bold ? "700 " : ""}14px Arial, sans-serif`;
          ctx.fillText(String(value || "—"), 575, y);
        };
        ctx.strokeStyle = "#eee5e1";
        ctx.beginPath();
        ctx.moveTo(60, 535);
        ctx.lineTo(580, 535);
        ctx.stroke();
        drawRow("Booking reference", reservation.id.slice(0, 8).toUpperCase(), 568, true);
        drawRow("Date and time", `${reservation.reservation_date} · ${shortTime(reservation.start_time)}`, 605);
        drawRow("Guests", `${reservation.number_of_guests}`, 642);
        drawRow("Table", `${reservation.tables?.[0]?.floor_name || ""} · ${reservation.tables?.[0]?.table_number || ""}`, 679);
        drawRow("Reservation fee", `₹${Number(reservation.fee_amount).toFixed(2)}`, 716, true);
        drawRow("Payment status", reservation.payment_status === "PAID" ? "Paid" : "Payment pending", 753, true);
        ctx.textAlign = "center";
        ctx.fillStyle = "#938781";
        ctx.font = "11px Arial, sans-serif";
        ctx.fillText(reservation.status === "CONFIRMED" ? "Present this pass when you arrive." : "Entry is valid after the restaurant confirms payment.", 320, 795);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) { reject(error); }
    };
    qr.onerror = reject;
    qr.src = qrData;
  });
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
  const [qrCode, setQrCode] = useState("");
  const [passDownload, setPassDownload] = useState("");
  const [qrError, setQrError] = useState("");
  const operatingHours = useMemo(() => restaurant?.hours || [], [restaurant]);
  const hoursByDay = useMemo(() => Object.fromEntries(operatingHours.map((item) => [item.day.toLowerCase(), item])), [operatingHours]);
  const hasConfiguredHours = operatingHours.length > 0;

  function isOpenDate(value) {
    const day = new Date(`${value}T12:00:00`).getDay();
    return Boolean(hoursByDay[weekDays[day]]?.enabled);
  }

  function isSlotWithinHours(dayValue, slot) {
    const schedule = hoursByDay[weekDays[new Date(`${dayValue}T12:00:00`).getDay()]];
    if (!schedule?.enabled || !schedule.opens || !schedule.closes) return false;
    const toMinutes = (value) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
    const start = toMinutes(to24Hour(slot));
    let end = start + 90;
    let close = toMinutes(schedule.closes);
    const open = toMinutes(schedule.opens);
    if (close <= open) close += 1440;
    if (end > 1440) end -= 1440;
    if (end < start) end += 1440;
    return start >= open && end <= close;
  }

  useEffect(() => {
    let active = true;
    requestJson(`/api/customer/restaurants/${restaurantId}`).then((value) => active && setRestaurant(value)).catch((reason) => active && setError(reason.message));
    requestJson("/api/customer/me").then((value) => active && setUser(value)).catch(() => active && navigate("/customer/login", { replace: true }));
    return () => { active = false; };
  }, [restaurantId, navigate]);

  useEffect(() => {
    if (!hasConfiguredHours || isOpenDate(date)) return;
    const start = new Date(`${date}T12:00:00`);
    for (let offset = 1; offset <= 370; offset += 1) {
      const candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      const candidateKey = isoDate(candidate);
      if (isOpenDate(candidateKey)) {
        setDate(candidateKey);
        setMonth(new Date(candidate.getFullYear(), candidate.getMonth(), 1));
        break;
      }
    }
  }, [hasConfiguredHours, hoursByDay, date]);

  useEffect(() => {
    let active = true;
    setAvailabilityError("");
    const slots = [...lunchSlots, ...dinnerSlots];
    const openSlots = slots.filter((slot) => isSlotWithinHours(date, slot));
    setAvailability(Object.fromEntries(slots.map((slot) => [slot, { loading: openSlots.includes(slot), tables: [], closed: !openSlots.includes(slot) }])));
    const lookups = openSlots.map(async (slot) => {
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
  }, [restaurantId, date, guests, hoursByDay]);

  useEffect(() => {
    if (step !== 4 || !reservation?.id) return undefined;
    let active = true;
    setPassDownload("");
    setQrCode("");
    const pass = {
      type: "DINEBOOK_RESERVATION_PASS",
      reservation_id: reservation.id,
      customer: reservation.customer_name,
      restaurant: restaurant?.name,
      date: reservation.reservation_date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      guests: reservation.number_of_guests,
      table: reservation.tables?.[0]?.table_number,
      floor: reservation.tables?.[0]?.floor_name,
      fee_amount: reservation.fee_amount,
      payment_status: reservation.payment_status,
      reservation_status: reservation.status,
    };
    QRCode.toDataURL(JSON.stringify(pass), { errorCorrectionLevel: "H", margin: 2, width: 240, color: { dark: "#40101b", light: "#ffffff" } })
      .then(async (value) => {
        if (!active) return;
        setQrCode(value);
        setQrError("");
        setPassDownload(await makePassImage(value, reservation, restaurant));
      })
      .catch(() => { if (active) setQrError("Could not generate the reservation pass. Refresh to try again."); });
    return () => { active = false; };
  }, [step, reservation, restaurant]);

  useEffect(() => {
    if (step !== 4 || !reservation?.id || reservation.status !== "PENDING_PAYMENT") return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const latest = await requestJson(`/api/customer/reservations/${reservation.id}`);
        if (active) setReservation(latest);
      } catch { /* Keep the last displayed reservation while briefly offline. */ }
    };
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [step, reservation?.id, reservation?.status]);

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
      saveReservation(user?.email, { ...result, restaurant_name: restaurant?.name, restaurant_location: restaurant?.location || restaurant?.address });
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
                <div className="booking-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="booking-calendar-weekday" key={day}>{day}</span>)}{calendarDays.map((day) => { const key = isoDate(day); const outside = day.getMonth() !== month.getMonth(); const past = key < isoDate(new Date()); const closed = !hoursByDay[weekDays[day.getDay()]]?.enabled; return <button type="button" disabled={outside || past || closed} title={closed ? "Restaurant is closed" : undefined} key={key} className={`${outside ? "outside " : ""}${past ? "past " : ""}${closed ? "closed " : ""}${date === key ? "selected" : ""}`} onClick={() => chooseDate(key)}>{day.getDate()}</button>; })}</div>
                {!hasConfiguredHours && <p className="booking-hours-message">This restaurant has not configured operating hours, so reservations are unavailable.</p>}
              </section>
              <section className="booking-guest-panel"><div><h3>Number of Guests</h3><p>For parties larger than 12, please contact the restaurant.</p></div><div className="booking-guest-stepper"><button type="button" aria-label="Remove guest" disabled={guests <= 1} onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><strong>{guests} {guests === 1 ? "Guest" : "Guests"}</strong><button type="button" aria-label="Add guest" disabled={guests >= 12} onClick={() => setGuests((value) => Math.min(12, value + 1))}><Plus size={16} /></button></div></section>
              <section className="booking-slots-panel"><h3>Available Time Slots</h3><p className="booking-hours-message">Time choices follow this restaurant’s operating hours.</p><h4>LUNCH</h4><div className="booking-slot-row">{lunchSlots.map((slot) => <SlotButton key={slot} slot={slot} selected={time === slot} availability={availability[slot]} onClick={() => setTime(slot)} />)}</div><h4>DINNER</h4><div className="booking-slot-row">{dinnerSlots.map((slot) => <SlotButton key={slot} slot={slot} selected={time === slot} availability={availability[slot]} onClick={() => setTime(slot)} />)}</div>{availabilityError && <p className="reservation-page-error">{availabilityError}</p>}</section>
            </>}

            {step === 2 && <section className="booking-table-panel"><span className="booking-step-label">RESERVATION STEP 2 OF 4</span><h2>Select Your Table</h2><p>Available tables for {selectedDateLabel} at {time} · {guests} guests</p><div className="booking-table-legend"><span>Available</span><span>Selected</span><span>Unavailable</span></div><div className="booking-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={selectedTableId === table.id ? "selected" : ""} onClick={() => setSelectedTableId(table.id)}><span className="booking-table-bullet">{selectedTableId === table.id ? <Check size={15} /> : null}</span><span><strong>Table {table.table_number}</strong><small>{table.floor_name} · {table.capacity} seats · {table.table_type}</small></span><b>₹{Number(table.reservation_fee).toFixed(2)}</b></button>)}</div><button type="button" className="booking-back-button" onClick={() => setStep(1)}>Back to date & time</button></section>}

            {step === 3 && <section className="booking-review-panel"><span className="booking-step-label">RESERVATION STEP 3 OF 4</span><h2>Review Reservation</h2><p>Check your table and booking details before submitting.</p><div className="booking-review-lines"><ReviewLine label="Date" value={selectedDateLabel} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Preferred time" value={time} /><ReviewLine label="Selected table" value={`${selectedTable?.floor_name} · Table ${selectedTable?.table_number}`} /><ReviewLine label="Table booking fee" value={`₹${quotedFee.toFixed(2)}`} bold /></div><div className="booking-payment-note"><strong>Payment required to confirm</strong><p>This reservation will remain pending until the restaurant records that it has received the table booking fee.</p></div><button type="button" className="booking-back-button" onClick={() => setStep(2)}>Change selected table</button></section>}

            {step === 4 && reservation && <section className="booking-result-panel"><span className="booking-step-label">RESERVATION PASS</span><div className={`booking-result-icon ${reservation.status === "CONFIRMED" ? "paid" : "pending"}`}>{reservation.status === "CONFIRMED" ? "✓" : "!"}</div><h2>{reservation.status === "CONFIRMED" ? "Reservation Confirmed" : "Reservation Request Received"}</h2><p>{reservation.status === "CONFIRMED" ? "Payment is confirmed. Show this QR pass at the restaurant when you arrive." : "Your table is held while the restaurant verifies payment. This pass will update after confirmation."}</p><div className="booking-pass-layout"><div className="booking-review-lines"><ReviewLine label="Booking reference" value={reservation.id.slice(0, 8).toUpperCase()} /><ReviewLine label="Date & time" value={`${reservation.reservation_date} · ${shortTime(reservation.start_time)}`} /><ReviewLine label="Table" value={`${reservation.tables?.[0]?.floor_name} · Table ${reservation.tables?.[0]?.table_number}`} /><ReviewLine label="Guests" value={`${reservation.number_of_guests}`} /><ReviewLine label="Table booking fee" value={`₹${Number(reservation.fee_amount).toFixed(2)}`} bold /><ReviewLine label="Payment status" value={reservation.payment_status === "PAID" ? "Paid" : "Payment pending"} bold /></div><div className="booking-qr-card"><strong>Customer Reservation Pass</strong>{qrCode ? <img src={qrCode} alt="QR code containing reservation pass details" /> : <span className="booking-qr-placeholder">{qrError || "Generating pass…"}</span>}<small>{reservation.status === "CONFIRMED" ? "Present this code at the restaurant." : "Valid for entry after payment is confirmed."}</small><a className={`booking-download-pass${passDownload ? " ready" : ""}`} href={passDownload || undefined} download={`DineBook-pass-${reservation.id.slice(0, 8)}.png`} aria-disabled={!passDownload}>{passDownload ? "Download reservation pass" : "Preparing download…"}</a></div></div>{qrError && <p className="reservation-page-error">{qrError}</p>}<button type="button" className="booking-back-button" onClick={async () => { try { const latest = await requestJson(`/api/customer/reservations/${reservation.id}`); setReservation(latest); } catch (reason) { setError(reason.message); } }}>Refresh reservation status</button> <Link to={`/customer/restaurants/${restaurantId}`} className="booking-back-button">Back to restaurant</Link></section>}
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
