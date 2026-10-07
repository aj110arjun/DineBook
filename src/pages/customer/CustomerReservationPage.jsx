import { useEffect, useMemo, useState } from "react";
import { Armchair, ArrowLeft, ArrowRight, Banknote, CalendarDays, Check, CreditCard, Landmark, MapPin, Minus, Plus, Smartphone, Utensils, Users, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import CustomTimePicker from "../../components/CustomTimePicker.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { photo } from "../../data/landingData.js";
import { saveReservation } from "../../data/customerReservations.js";
import "./CustomerReservationPage.css";

const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function to24Hour(value) {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const [clock, period] = value.split(" ");
  let [hour, minute] = clock.split(":").map(Number);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function displayTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
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
        const qrSize = 210;
        ctx.drawImage(qr, (canvas.width - qrSize) / 2, 267, qrSize, qrSize);
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
        drawRow("Reservation ID", reservation.id.slice(0, 8).toUpperCase(), 568, true);
        drawRow("Date and time", `${reservation.reservation_date} · ${shortTime(reservation.start_time)}`, 605);
        drawRow("Guests", `${reservation.number_of_guests}`, 642);
        drawRow("Table", reservation.tables?.map((table) => `${table.floor_name} · ${table.table_number}`).join(", ") || "—", 679);
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
  const [time, setTime] = useState(to24Hour(location.state?.time || "20:00"));
  const [fulfillmentType, setFulfillmentType] = useState("TABLE_ONLY");
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [preorderCart, setPreorderCart] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("PAY_AT_DESK");
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
  const checkoutStep = fulfillmentType === "PREORDER" ? 4 : 3;
  const resultStep = checkoutStep + 1;
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
    const start = toMinutes(slot);
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
    if (fulfillmentType !== "PREORDER" || menuCategories.length) return;
    let active = true;
    setMenuLoading(true);
    requestJson(`/api/customer/restaurants/${restaurantId}/menu`)
      .then((value) => { if (active) { setMenuCategories(value); setMenuError(""); } })
      .catch((reason) => { if (active) setMenuError(reason.message); })
      .finally(() => { if (active) setMenuLoading(false); });
    return () => { active = false; };
  }, [fulfillmentType, menuCategories.length, restaurantId]);

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
    const isOpen = time && isSlotWithinHours(date, time);
    setAvailability({ [time]: { loading: Boolean(isOpen), tables: [], closed: !isOpen } });
    if (!isOpen) return () => { active = false; };
    const params = new URLSearchParams({ restaurant_id: restaurantId, reservation_date: date, start_time: time, number_of_guests: String(guests) });
    requestJson(`/api/customer/reservations/availability?${params}`).then((result) => {
      if (active) setAvailability({ [time]: { loading: false, tables: result.tables || [] } });
    }).catch((reason) => {
      if (!active) return;
      setAvailability({ [time]: { loading: false, tables: [], error: reason.message } });
      setAvailabilityError(reason.message);
    });
    return () => { active = false; };
  }, [restaurantId, date, guests, hoursByDay, time]);

  useEffect(() => {
    if (step !== resultStep || !reservation?.id) return undefined;
    let active = true;
    setPassDownload("");
    setQrCode("");
    QRCode.toDataURL(JSON.stringify({ reservation_id: reservation.id }), { errorCorrectionLevel: "M", margin: 4, width: 220, color: { dark: "#111111", light: "#ffffff" } })
      .then(async (value) => {
        if (!active) return;
        setQrCode(value);
        setQrError("");
        setPassDownload(await makePassImage(value, reservation, restaurant));
      })
      .catch(() => { if (active) setQrError("Could not generate the reservation pass. Refresh to try again."); });
    return () => { active = false; };
  }, [step, resultStep, reservation, restaurant]);

  useEffect(() => {
    if (step !== resultStep || !reservation?.id || reservation.status !== "PENDING_PAYMENT") return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const latest = await requestJson(`/api/customer/reservations/${reservation.id}`);
        if (active) setReservation(latest);
      } catch { /* Keep the last displayed reservation while briefly offline. */ }
    };
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [step, resultStep, reservation?.id, reservation?.status]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);
  const selectedAvailability = availability[time] || { loading: true, tables: [] };
  const availableTables = selectedAvailability.tables || [];
  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
  const quotedFee = step === 1 ? Math.min(...(availableTables.length ? availableTables.map((table) => Number(table.reservation_fee)) : [250])) : Number(selectedTable?.reservation_fee || reservation?.fee_amount || 0);
  const preorderChoices = menuCategories.flatMap((category) => category.foods.flatMap((food) =>
    (food.variants || []).filter((variant) => food.is_available && variant.is_available).map((variant) => ({
      ...variant, foodName: food.name, categoryName: category.name, image: food.images?.[0]?.url,
    })),
  ));
  const selectedPreorderItems = preorderChoices.filter((item) => preorderCart[item.id]).map((item) => ({
    ...item, quantity: preorderCart[item.id], lineTotal: Number(item.price) * preorderCart[item.id],
  }));
  const preorderTotal = selectedPreorderItems.reduce((total, item) => total + item.lineTotal, 0);
  const checkoutTotal = quotedFee + (fulfillmentType === "PREORDER" ? preorderTotal : 0);
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

  function changePreorderQuantity(variantId, delta) {
    setPreorderCart((current) => {
      const quantity = Math.max(0, Math.min(99, (current[variantId] || 0) + delta));
      const next = { ...current };
      if (quantity) next[variantId] = quantity;
      else delete next[variantId];
      return next;
    });
  }

  function continueFromTable() {
    setStep(fulfillmentType === "PREORDER" ? 3 : checkoutStep);
  }

  async function submitReservation() {
    if (!selectedTable) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestJson("/api/customer/reservations", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: restaurantId, reservation_date: date, start_time: time, number_of_guests: guests, table_ids: selectedTable.table_ids, fulfillment_type: fulfillmentType, payment_method: paymentMethod, preorder_items: fulfillmentType === "PREORDER" ? selectedPreorderItems.map(({ id, quantity }) => ({ variant_id: id, quantity })) : [] }),
      });
      setReservation(result);
      saveReservation(user?.email, { ...result, restaurant_name: restaurant?.name, restaurant_location: restaurant?.location || restaurant?.address });
      setStep(resultStep);
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
              <section className="booking-calendar-panel"><header><div><span className="booking-step-label">RESERVATION STEP 1 OF {fulfillmentType === "PREORDER" ? 5 : 4}</span><h2>Select Date</h2></div><div className="booking-month-controls"><button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ArrowLeft size={16} /></button><strong>{monthTitle}</strong><button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ArrowRight size={16} /></button></div></header>
                <div className="booking-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="booking-calendar-weekday" key={day}>{day}</span>)}{calendarDays.map((day) => { const key = isoDate(day); const outside = day.getMonth() !== month.getMonth(); const past = key < isoDate(new Date()); const closed = !hoursByDay[weekDays[day.getDay()]]?.enabled; return <button type="button" disabled={outside || past || closed} title={closed ? "Restaurant is closed" : undefined} key={key} className={`${outside ? "outside " : ""}${past ? "past " : ""}${closed ? "closed " : ""}${date === key ? "selected" : ""}`} onClick={() => chooseDate(key)}>{day.getDate()}</button>; })}</div>
                {!hasConfiguredHours && <p className="booking-hours-message">This restaurant has not configured operating hours, so reservations are unavailable.</p>}
              </section>
              <section className="booking-guest-panel"><div><h3>Number of Guests</h3><p>For parties larger than 16, please contact the restaurant.</p></div><div className="booking-guest-stepper"><button type="button" aria-label="Remove guest" disabled={guests <= 1} onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><strong>{guests} {guests === 1 ? "Guest" : "Guests"}</strong><button type="button" aria-label="Add guest" disabled={guests >= 16} onClick={() => setGuests((value) => Math.min(16, value + 1))}><Plus size={16} /></button></div></section>
              <section className="booking-intent-panel"><h3>What would you like to do?</h3><p>Choose how you’d like to enjoy your visit.</p><div className="booking-intent-options"><button type="button" className={fulfillmentType === "TABLE_ONLY" ? "selected" : ""} onClick={() => setFulfillmentType("TABLE_ONLY")}><span className="booking-intent-icon"><Armchair size={18} /></span><strong>Reserve a table</strong><small>Book your table and order when you arrive.</small></button><button type="button" className={fulfillmentType === "PREORDER" ? "selected" : ""} onClick={() => setFulfillmentType("PREORDER")}><span className="booking-intent-icon"><Utensils size={18} /></span><strong>Preorder food</strong><small>Choose dishes now and have them ready for your visit.</small></button></div></section>
              <section className="booking-slots-panel"><h3>Choose a time</h3><p className="booking-hours-message">Select any time during the restaurant’s operating hours. Availability is checked for your chosen time.</p><label className="custom-booking-time-label" htmlFor="reservation-time">Reservation time</label><CustomTimePicker id="reservation-time" label="Reservation time" value={time} onChange={(value) => { setTime(value); setSelectedTableId(""); }} />{selectedAvailability.loading && <p className="booking-hours-message">Checking table availability…</p>}{selectedAvailability.closed && <p className="reservation-page-error">This time is outside the restaurant’s operating hours.</p>}{!selectedAvailability.loading && !selectedAvailability.closed && !availableTables.length && <p className="reservation-page-error">No tables are available at this time.</p>}{availabilityError && <p className="reservation-page-error">{availabilityError}</p>}</section>
            </>}

            {step === 2 && <section className="booking-table-panel"><span className="booking-step-label">RESERVATION STEP 2 OF {fulfillmentType === "PREORDER" ? 5 : 4}</span><h2>Select Your Table Setup</h2><p>Suggested tables for {selectedDateLabel} at {displayTime(time)} · {guests} guests</p><div className="booking-table-legend"><span>Available</span><span>Selected</span><span>Unavailable</span></div><div className="booking-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={selectedTableId === table.id ? "selected" : ""} onClick={() => setSelectedTableId(table.id)}><span className="booking-table-bullet">{selectedTableId === table.id ? <Check size={15} /> : null}</span><span><strong>{table.table_ids.length > 1 ? `${table.table_ids.length} tables together` : `Table ${table.table_number}`}</strong><small>{table.floor_name} · Tables {table.table_number} · Seats up to {table.capacity} · {table.table_type}</small></span><b>₹{Number(table.reservation_fee).toFixed(2)}</b></button>)}</div><button type="button" className="booking-back-button" onClick={() => setStep(1)}>Back to date & time</button></section>}

            {step === 3 && fulfillmentType === "PREORDER" && <section className="booking-preorder-panel"><span className="booking-step-label">RESERVATION STEP 3 OF 5</span><h2>Preorder from the menu</h2><p>Choose your dishes and quantities. You can pay at the restaurant desk during checkout.</p>{menuLoading ? <p className="booking-hours-message">Loading menu…</p> : menuError ? <p className="reservation-page-error">{menuError}</p> : !menuCategories.length ? <p className="booking-hours-message">This restaurant has no menu items available for preorder yet.</p> : menuCategories.map((category) => <div className="booking-preorder-category" key={category.id}><h3>{category.name}</h3>{category.foods.filter((food) => food.is_available && food.variants?.some((variant) => variant.is_available)).map((food) => <article className="booking-preorder-food" key={food.id}>{food.images?.[0]?.url && <img src={food.images[0].url} alt="" />}<div className="booking-preorder-food-copy"><strong>{food.name}</strong>{food.description && <small>{food.description}</small>}{food.variants.filter((variant) => variant.is_available).map((variant) => <div className="booking-preorder-variant" key={variant.id}><span>{variant.name} · ₹{Number(variant.price).toFixed(2)}</span><div><button type="button" aria-label={`Remove one ${food.name} ${variant.name}`} disabled={!preorderCart[variant.id]} onClick={() => changePreorderQuantity(variant.id, -1)}>−</button><strong>{preorderCart[variant.id] || 0}</strong><button type="button" aria-label={`Add one ${food.name} ${variant.name}`} onClick={() => changePreorderQuantity(variant.id, 1)}>+</button></div></div>)}</div></article>)}</div>)}<div className="booking-preorder-footer"><button type="button" className="booking-back-button" onClick={() => setStep(2)}>Back to table</button><button type="button" className="booking-primary-action" disabled={!selectedPreorderItems.length} onClick={() => setStep(checkoutStep)}>Continue to checkout · ₹{preorderTotal.toFixed(2)}</button></div></section>}

            {step === checkoutStep && <section className="booking-checkout-panel"><span className="booking-step-label">RESERVATION STEP {checkoutStep} OF {fulfillmentType === "PREORDER" ? 5 : 4}</span><h2>Checkout</h2><p>Review your reservation and choose how you’ll pay at the restaurant.</p><div className="booking-payment-methods"><button type="button" className="selected" onClick={() => setPaymentMethod("PAY_AT_DESK")}><Banknote size={19} /><span><strong>Pay at desk</strong><small>Pay the table fee and preorder in person.</small></span><i>Selected</i></button><button type="button" disabled><CreditCard size={19} /><span><strong>Credit / debit card</strong><small>Online card payments are coming soon.</small></span><i>Coming soon</i></button><button type="button" disabled><Smartphone size={19} /><span><strong>UPI</strong><small>UPI checkout is coming soon.</small></span><i>Coming soon</i></button><button type="button" disabled><Landmark size={19} /><span><strong>Net banking</strong><small>Net banking is coming soon.</small></span><i>Coming soon</i></button><button type="button" disabled><Wallet size={19} /><span><strong>Wallet</strong><small>Wallet payments are coming soon.</small></span><i>Coming soon</i></button></div><div className="booking-checkout-summary"><h3>Reservation summary</h3><ReviewLine label="Date" value={selectedDateLabel} /><ReviewLine label="Time" value={displayTime(time)} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Table" value={`${selectedTable?.floor_name} · Table ${selectedTable?.table_number}`} /><ReviewLine label="Table reservation fee" value={`₹${quotedFee.toFixed(2)}`} />{fulfillmentType === "PREORDER" && <><ReviewLine label="Preorder food" value={`₹${preorderTotal.toFixed(2)}`} />{selectedPreorderItems.map((item) => <ReviewLine key={item.id} label={`${item.foodName} · ${item.variantName} × ${item.quantity}`} value={`₹${item.lineTotal.toFixed(2)}`} />)}</>}<ReviewLine label="Total due at desk" value={`₹${checkoutTotal.toFixed(2)}`} bold /></div><button type="button" className="booking-back-button" onClick={() => setStep(fulfillmentType === "PREORDER" ? 3 : 2)}>Back</button></section>}
            {step === resultStep && reservation && <section className="booking-result-panel"><span className="booking-step-label">RESERVATION PASS</span><div className={`booking-result-icon ${reservation.status === "CONFIRMED" ? "paid" : "pending"}`}>{reservation.status === "CONFIRMED" ? "✓" : "!"}</div><h2>{reservation.status === "CONFIRMED" ? "Reservation Confirmed" : "Reservation Request Received"}</h2><p>{reservation.status === "CONFIRMED" ? "Payment is confirmed. Show this QR pass at the restaurant when you arrive." : reservation.fulfillment_type === "PREORDER" ? "Your table and preorder are saved. Pay the reservation fee and preorder total at the restaurant desk." : "Your table is requested. Pay the reservation fee at the restaurant desk to confirm."}</p><div className="booking-pass-layout"><div className="booking-review-lines"><ReviewLine label="Reservation ID" value={reservation.id.slice(0, 8).toUpperCase()} /><ReviewLine label="Date & time" value={`${reservation.reservation_date} · ${shortTime(reservation.start_time)}`} /><ReviewLine label="Table" value={reservation.tables?.map((table) => `${table.floor_name} · ${table.table_number}`).join(", ") || "Pending"} /><ReviewLine label="Guests" value={`${reservation.number_of_guests}`} /><ReviewLine label="Table booking fee" value={`₹${Number(reservation.fee_amount).toFixed(2)}`} />{reservation.fulfillment_type === "PREORDER" && <ReviewLine label="Preorder food" value={`₹${Number(reservation.preorder_total || 0).toFixed(2)}`} />}<ReviewLine label="Payment method" value="Pay at desk" /><ReviewLine label="Payment status" value={reservation.payment_status === "PAID" ? "Paid" : "Payment due at restaurant"} bold /></div><div className="booking-qr-card"><div className="booking-qr-caption"><span>RESERVATION ID</span><strong>{reservation.id.slice(0, 8).toUpperCase()}</strong></div>{qrCode ? <img src={qrCode} alt="QR code for reservation ID" /> : <span className="booking-qr-placeholder">{qrError || "Generating QR…"}</span>}<small>Scan to look up this reservation at the restaurant.</small><a className={`booking-download-pass${passDownload ? " ready" : ""}`} href={passDownload || undefined} download={`DineBook-pass-${reservation.id.slice(0, 8)}.png`} aria-disabled={!passDownload}>{passDownload ? "Download reservation pass" : "Preparing download…"}</a></div></div>{qrError && <p className="reservation-page-error">{qrError}</p>}<button type="button" className="booking-back-button" onClick={async () => { try { const latest = await requestJson(`/api/customer/reservations/${reservation.id}`); setReservation(latest); } catch (reason) { setError(reason.message); } }}>Refresh reservation status</button> <Link to={`/customer/restaurants/${restaurantId}`} className="booking-back-button">Back to restaurant</Link></section>}
          </section>

          <aside className="booking-summary-column"><section className="booking-summary-card"><span className="booking-step-label">RESERVATION STEP {step} OF {fulfillmentType === "PREORDER" ? 5 : 4}</span><h2>{step === 1 ? "Booking Summary" : step === 2 ? "Dine-in Details" : step === checkoutStep ? "Checkout Summary" : step === resultStep ? "Reservation Status" : fulfillmentType === "PREORDER" ? "Preorder" : "Reservation Summary"}</h2><div className="booking-summary-lines"><ReviewLine label="Selected date" value={selectedDateLabel} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Preferred time" value={displayTime(time)} />{step >= 2 && <ReviewLine label="Selected table" value={selectedTable ? `Table ${selectedTable.table_number}` : "Choose a table"} />}<ReviewLine label="Table reservation fee" value={selectedAvailability.loading && step === 1 ? "Checking…" : `₹${quotedFee.toFixed(2)}`} />{fulfillmentType === "PREORDER" && <ReviewLine label="Preorder food" value={`₹${preorderTotal.toFixed(2)}`} />}<ReviewLine label={step >= checkoutStep ? "Total due at desk" : "Current total"} value={`₹${checkoutTotal.toFixed(2)}`} bold /></div>{step === 1 && <button type="button" className="booking-primary-action" disabled={selectedAvailability.loading || !availableTables.length} onClick={continueToTables}>{selectedAvailability.loading ? "Checking table availability…" : !availableTables.length ? "No tables available" : "Continue to Table Selection"}</button>}{step === 2 && <button type="button" className="booking-primary-action" disabled={!selectedTable} onClick={continueFromTable}>Continue</button>}{step === 3 && fulfillmentType === "PREORDER" && <button type="button" className="booking-primary-action" disabled={!selectedPreorderItems.length} onClick={() => setStep(checkoutStep)}>Continue to Checkout</button>}{step === checkoutStep && <button type="button" className="booking-primary-action" disabled={busy || (fulfillmentType === "PREORDER" && !selectedPreorderItems.length)} onClick={submitReservation}>{busy ? "Submitting…" : "Confirm reservation"}</button>}{step === resultStep && <Link to="/customer/restaurants" className="booking-primary-action booking-link-action">Explore restaurants</Link>}</section><p className="booking-summary-footnote">The fee is set by the restaurant manager for the selected table. Preordered food and the table reservation fee are due at the restaurant desk.</p>{error && step > 1 && <p className="reservation-page-error" role="alert">{error}</p>}</aside>
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
