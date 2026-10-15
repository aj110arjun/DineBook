import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, CreditCard, MapPin, Minus, Plus, Users, Utensils, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { photo } from "../../data/landingData.js";
import { saveReservation } from "../../data/customerReservations.js";
import "./CustomerReservationPage.css";

const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector("script[data-razorpay-checkout]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      document.body.appendChild(script);
    }
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
  });
}
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayInRestaurantTimezone = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
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
function paymentMethodLabel(method) {
  if (method === "WALLET") return "DineBook wallet";
  if (method === "RAZORPAY") return "Razorpay";
  if (method === "PAY_AT_DESK") return "Pay at restaurant";
  return "—";
}
function reservationPaymentLabel(reservation) {
  return reservation.payment_status === "PAID"
    ? `Paid via ${paymentMethodLabel(reservation.payment_method)}`
    : reservation.payment_status === "FAILED" ? "Payment failed" : "Payment pending";
}
function preorderPaymentLabel(reservation) {
  if (reservation.fulfillment_type !== "PREORDER") return "Not applicable";
  if (reservation.preorder_payment_status === "PAID") return `Paid via ${paymentMethodLabel(reservation.preorder_payment_method)}`;
  if (reservation.preorder_payment_method === "PAY_AT_DESK" && reservation.preorder_payment_status === "PENDING") return "Pay at restaurant";
  return reservation.preorder_payment_status === "FAILED" ? "Payment failed" : "Payment pending";
}
function shortTime(value) {
  if (!value) return "—";
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}
const reservationCode = (reservation) => reservation?.reservation_code || `RES-${String(reservation?.id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`;
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
        drawRow("Reservation code", reservationCode(reservation), 558, true);
        drawRow("Date and time", `${reservation.reservation_date} · ${shortTime(reservation.start_time)}`, 585);
        drawRow("Guests", `${reservation.number_of_guests}`, 612);
        drawRow("Table", reservation.tables?.map((table) => `${table.floor_name} · ${table.table_number}`).join(", ") || "—", 639);
        drawRow("Reservation fee", `₹${Number(reservation.fee_amount).toFixed(2)}`, 666, true);
        drawRow("Reservation payment", reservationPaymentLabel(reservation), 693, true);
        drawRow("Preorder", reservation.fulfillment_type === "PREORDER" ? `₹${Number(reservation.preorder_total || 0).toFixed(2)}` : "Not ordered", 720);
        drawRow("Preorder payment", preorderPaymentLabel(reservation), 747, true);
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
  const [hoursExceptions, setHoursExceptions] = useState([]);
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [date, setDate] = useState(location.state?.date || todayInRestaurantTimezone());
  const [month, setMonth] = useState(() => { const selected = new Date(`${location.state?.date || todayInRestaurantTimezone()}T12:00:00`); return new Date(selected.getFullYear(), selected.getMonth(), 1); });
  const [guests, setGuests] = useState(Number(location.state?.guests || 2));
  const [time, setTime] = useState(to24Hour(location.state?.time || "20:00"));
  const selectedTimeRef = useRef(time);
  selectedTimeRef.current = time;
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("WALLET");
  const [fulfillmentType, setFulfillmentType] = useState("TABLE_ONLY");
  const [preorderPaymentMethod, setPreorderPaymentMethod] = useState("PAY_AT_DESK");
  const [orderTaxPercent, setOrderTaxPercent] = useState(18);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [preorderCart, setPreorderCart] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [offerCode, setOfferCode] = useState("");
  const [offerPreview, setOfferPreview] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [availability, setAvailability] = useState({});
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [step, setStep] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [reservation, setReservation] = useState(null);
  const [paymentFailureMessage, setPaymentFailureMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [passDownload, setPassDownload] = useState("");
  const [qrError, setQrError] = useState("");
  const checkoutStep = 3;
  const resultStep = checkoutStep + 1;

  const operatingHours = useMemo(() => restaurant?.hours || [], [restaurant]);
  const hoursByDay = useMemo(() => Object.fromEntries(operatingHours.map((item) => [item.day.toLowerCase(), item])), [operatingHours]);
  const hasConfiguredHours = operatingHours.length > 0;

  function isOpenDate(value) {
    const exception = hoursExceptions.find((item) => item.start_date <= value && item.end_date >= value);
    if (exception) return !exception.is_closed && exception.periods?.length > 0;
    const day = new Date(`${value}T12:00:00`).getDay();
    return Boolean(hoursByDay[weekDays[day]]?.enabled);
  }

  useEffect(() => {
    let active = true;
    requestJson(`/api/customer/restaurants/${restaurantId}`).then((value) => active && setRestaurant(value)).catch((reason) => active && setError(reason.message));
    requestJson(`/api/customer/restaurants/${restaurantId}/operating-hours`).then((value) => { if (active) { setHoursExceptions(value.exceptions || []); setHoursLoaded(true); } }).catch(() => { if (active) { setHoursExceptions([]); setHoursLoaded(true); } });
    requestJson("/api/customer/me").then((value) => active && setUser(value)).catch(() => active && navigate("/customer/login", { replace: true }));
    return () => { active = false; };
  }, [restaurantId, navigate]);

  useEffect(() => {
    let active = true;
    setMenuLoading(true);
    Promise.all([
      requestJson(`/api/customer/restaurants/${restaurantId}/menu`),
      requestJson(`/api/customer/orders/offers?restaurant_id=${encodeURIComponent(restaurantId)}`),
    ]).then(([menu, offers]) => {
      if (active) { setMenuCategories(menu); setAvailableOffers(offers); }
    }).catch(() => {
      if (active) { setMenuCategories([]); setAvailableOffers([]); }
    }).finally(() => active && setMenuLoading(false));
    return () => { active = false; };
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    requestJson("/api/customer/wallet")
      .then((wallet) => active && setWalletBalance(Number(wallet.balance || 0)))
      .catch(() => active && setWalletBalance(0))
      .finally(() => active && setWalletLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    requestJson("/api/customer/orders/tax-rate")
      .then((result) => active && setOrderTaxPercent(Number(result.tax_percent ?? 18)))
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hasConfiguredHours || !hoursLoaded || isOpenDate(date)) return;
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
  }, [hasConfiguredHours, hoursLoaded, hoursExceptions, hoursByDay, date]);

  useEffect(() => {
    let active = true;
    setAvailabilityError("");
    setTimeSlotsLoading(true);
    setAvailability({});
    const params = new URLSearchParams({ restaurant_id: restaurantId, reservation_date: date, number_of_guests: String(guests) });
    const refreshAvailability = (initial = false) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      requestJson(`/api/customer/reservations/time-slots?${params}`, { signal: controller.signal }).then((result) => {
        if (!active) return;
        const nextAvailability = Object.fromEntries((result.slots || []).map((slot) => [slot.time, { loading: false, tables: slot.tables || [] }]));
        setAvailability(nextAvailability);
        if (!nextAvailability[selectedTimeRef.current] || !nextAvailability[selectedTimeRef.current].tables.length) {
          const firstAvailable = Object.keys(nextAvailability).find((slot) => nextAvailability[slot].tables.length);
          if (firstAvailable) setTime(firstAvailable);
        }
        setAvailabilityError("");
      }).catch((reason) => {
        if (active) setAvailabilityError(controller.signal.aborted
          ? "Checking table availability timed out. Please try again."
          : reason.message);
      }).finally(() => {
        window.clearTimeout(timeout);
        if (active && initial) setTimeSlotsLoading(false);
      });
    };
    refreshAvailability(true);
    const timer = window.setInterval(() => refreshAvailability(false), 30000);
    const onFocus = () => refreshAvailability(false);
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [restaurantId, date, guests, availabilityRefreshKey]);

  useEffect(() => {
    if (step !== resultStep || !reservation?.id || reservation.status !== "CONFIRMED") return undefined;
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
  const selectedAvailability = availability[time] || { loading: timeSlotsLoading, tables: [] };
  const reservationPaymentFailed = Boolean(paymentFailureMessage)
    || reservation?.status === "CANCELLED"
    || reservation?.payment_status === "FAILED";
  const paymentWasCancelled = paymentFailureMessage.toLowerCase().includes("cancelled");
  const availableTables = selectedAvailability.tables || [];
  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
  const preorderVariants = menuCategories.flatMap((category) => (category.foods || []).filter((food) => food.is_available).flatMap((food) => (food.variants || []).filter((variant) => variant.is_available).map((variant) => ({ ...variant, food_id: food.id, food_name: food.name, category_id: food.category_id || category.id, category_name: category.name }))));
  const preorderSubtotal = preorderCart.reduce((sum, line) => sum + Number(preorderVariants.find((variant) => variant.id === line.variant_id)?.price || 0) * line.quantity, 0);
  const preorderNet = Math.max(0, preorderSubtotal - (offerPreview?.valid ? Number(offerPreview.discount_amount) : 0));
  const preorderTaxAmount = Math.round(preorderNet * orderTaxPercent) / 100;
  const preorderTotalWithTax = preorderNet + preorderTaxAmount;
  const preorderFoodIds = new Set(preorderCart.map((line) => preorderVariants.find((variant) => variant.id === line.variant_id)?.food_id).filter(Boolean));
  const preorderCategoryIds = new Set(preorderCart.map((line) => preorderVariants.find((variant) => variant.id === line.variant_id)?.category_id).filter(Boolean));
  const relevantOffers = availableOffers.filter((offer) => offer.status === "ACTIVE" && (offer.applicability === "RESTAURANT" || (offer.applicability === "ITEMS" && (offer.eligible_food_ids || []).some((id) => preorderFoodIds.has(id))) || (offer.applicability === "CATEGORIES" && (offer.eligible_category_ids || []).some((id) => preorderCategoryIds.has(id)))));
  const quotedFee = step === 1 ? Math.min(...(availableTables.length ? availableTables.map((table) => Number(table.reservation_fee)) : [250])) : Number(selectedTable?.reservation_fee || reservation?.fee_amount || 0);
  const checkoutTotal = quotedFee + (fulfillmentType === "PREORDER" ? preorderTotalWithTax : 0);
  const summaryCheckoutTotal = step === resultStep && reservation
    ? Number(reservation.fee_amount || 0) + (reservation.fulfillment_type === "PREORDER" ? Number(reservation.preorder_total || 0) : 0)
    : checkoutTotal;
  const walletRequired = (paymentMethod === "WALLET" ? quotedFee : 0) + (fulfillmentType === "PREORDER" && preorderPaymentMethod === "WALLET" ? preorderTotalWithTax : 0);
  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
  const selectedDateException = hoursExceptions.find((item) => item.start_date <= date && item.end_date >= date);

  function selectPaymentMethod(method) {
    setPaymentMethod(method);
    setPreorderPaymentMethod((current) => current === "PAY_AT_DESK" ? current : method);
  }

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


  function continueFromTable() {
    if (fulfillmentType === "PREORDER" && preorderCart.length === 0) {
      setError("Add at least one menu item to your preorder.");
      return;
    }
    setError("");
    setStep(checkoutStep);
  }

  function changePreorderQuantity(variantId, delta) {
    setOfferPreview(null);
    setPreorderCart((current) => {
      const existing = current.find((line) => line.variant_id === variantId);
      if (!existing && delta > 0) return [...current, { variant_id: variantId, quantity: 1 }];
      return current.map((line) => line.variant_id === variantId ? { ...line, quantity: Math.min(99, line.quantity + delta) } : line).filter((line) => line.quantity > 0);
    });
  }

  async function previewPreorderOffer(code = offerCode) {
    if (!code.trim() || preorderCart.length === 0) { setError("Add preorder items and enter an offer code first."); return; }
    setOfferBusy(true); setError(""); setOfferPreview(null);
    const normalizedCode = code.trim().toUpperCase(); setOfferCode(normalizedCode);
    try {
      const result = await requestJson("/api/customer/orders/offers/preview", { method: "POST", body: JSON.stringify({ restaurant_id: restaurantId, offer_code: normalizedCode, items: preorderCart }) });
      setOfferPreview(result);
      if (!result.valid) setError(result.reason || "This offer cannot be applied.");
    } catch (reason) { setError(reason.message); }
    finally { setOfferBusy(false); }
  }

  async function submitReservation() {
    if (!selectedTable) return;
    setBusy(true);
    setError("");
    setPaymentFailureMessage("");
    try {
      if (paymentMethod === "RAZORPAY") await loadRazorpayCheckout();
      const result = await requestJson("/api/customer/reservations", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: restaurantId, reservation_date: date, start_time: time, number_of_guests: guests, table_ids: selectedTable.table_ids, fulfillment_type: fulfillmentType, payment_method: paymentMethod, preorder_payment_method: fulfillmentType === "PREORDER" ? preorderPaymentMethod : null, preorder_items: fulfillmentType === "PREORDER" ? preorderCart : [], offer_code: fulfillmentType === "PREORDER" && offerPreview?.valid ? offerCode : null }),
      });
      setReservation(result);
      saveReservation(user?.email, { ...result, restaurant_name: restaurant?.name, restaurant_location: restaurant?.location || restaurant?.address });
      if (result.payment_checkout) {
        let paymentHandled = false;
        let cancellationStarted = false;
        const cancelPendingCheckout = async (message) => {
          if (paymentHandled || cancellationStarted) return;
          cancellationStarted = true;
          setPaymentFailureMessage(message);
          try {
            await requestJson(`/api/customer/reservations/${result.id}/cancel`, { method: "POST" });
          } catch {
            // A webhook or the payment callback may already have completed the state change.
          }
          try {
            const latest = await requestJson(`/api/customer/reservations/${result.id}`);
            setReservation(latest);
            saveReservation(user?.email, { ...latest, restaurant_name: restaurant?.name, restaurant_location: restaurant?.location || restaurant?.address });
          } catch {
            // The reservation is still cancelled server-side when the cancel request succeeded.
          }
          setError("");
          setStep(resultStep);
          setBusy(false);
        };
        const checkout = new window.Razorpay({
          key: result.payment_checkout.key_id,
          amount: result.payment_checkout.amount,
          currency: result.payment_checkout.currency,
          name: result.payment_checkout.name,
          description: result.payment_checkout.description,
          order_id: result.payment_checkout.order_id,
          prefill: { name: user?.name || "", email: user?.email || "" },
          theme: { color: "#641d2c" },
          handler: async (payment) => {
            paymentHandled = true;
            try {
              const verified = await requestJson(`/api/customer/reservations/${result.id}/payment/verify`, {
                method: "POST", body: JSON.stringify(payment),
              });
              setReservation(verified);
              setPaymentFailureMessage("");
              saveReservation(user?.email, { ...verified, restaurant_name: restaurant?.name, restaurant_location: restaurant?.location || restaurant?.address });
              setError("");
            } catch (reason) {
              setError(reason.message || "Payment is still being confirmed. Refresh the reservation status shortly.");
            } finally {
              setStep(resultStep);
              setBusy(false);
            }
          },
          modal: { ondismiss: () => { if (!paymentHandled) void cancelPendingCheckout("Payment was cancelled before completion. Your reservation was not confirmed. Please try again."); } },
        });
        checkout.on("payment.failed", (response) => {
          const cancellation = cancelPendingCheckout("Payment failed. Please try again later.");
          checkout.close();
          void cancellation;
        });
        checkout.open();
        return;
      }
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
              <section className="booking-calendar-panel"><header><div><span className="booking-step-label">RESERVATION STEP 1 OF 3</span><h2>Select Date</h2></div><div className="booking-month-controls"><button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ArrowLeft size={16} /></button><strong>{monthTitle}</strong><button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ArrowRight size={16} /></button></div></header>
                <div className="booking-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="booking-calendar-weekday" key={day}>{day}</span>)}{calendarDays.map((day) => { const key = isoDate(day); const outside = day.getMonth() !== month.getMonth(); const past = key <= todayInRestaurantTimezone(); const closed = hasConfiguredHours && !isOpenDate(key); return <button type="button" disabled={outside || past || closed} title={closed ? "Restaurant is closed" : undefined} key={key} className={`${outside ? "outside " : ""}${past ? "past " : ""}${closed ? "closed " : ""}${date === key ? "selected" : ""}`} onClick={() => chooseDate(key)}>{day.getDate()}</button>; })}</div>
                {date <= todayInRestaurantTimezone() && <p className="booking-hours-message">Reservations must be made at least one day in advance. Please choose a future date.</p>}
                {!hasConfiguredHours && <p className="booking-hours-message">This restaurant has not configured operating hours, so reservations are unavailable.</p>}
              </section>
              <section className="booking-guest-panel"><div><h3>Number of Guests</h3><p>For parties larger than 16, please contact the restaurant.</p></div><div className="booking-guest-stepper"><button type="button" aria-label="Remove guest" disabled={guests <= 1} onClick={() => setGuests((value) => Math.max(1, value - 1))}><Minus size={16} /></button><strong>{guests} {guests === 1 ? "Guest" : "Guests"}</strong><button type="button" aria-label="Add guest" disabled={guests >= 16} onClick={() => setGuests((value) => Math.min(16, value + 1))}><Plus size={16} /></button></div></section>
              <section className="booking-intent-panel"><h3>Choose your booking option</h3><p>Reserve a table only, or preorder food so the restaurant can prepare it for your visit.</p><div className="booking-intent-options" role="group" aria-label="Booking option"><button type="button" className={fulfillmentType === "PREORDER" ? "selected" : ""} aria-pressed={fulfillmentType === "PREORDER"} onClick={() => { setFulfillmentType("PREORDER"); setError(""); }}><span className="booking-intent-icon"><Utensils size={18}/></span><strong>Preorder food</strong><small>Choose menu items now and select how to pay for them.</small></button><button type="button" className={fulfillmentType === "TABLE_ONLY" ? "selected" : ""} aria-pressed={fulfillmentType === "TABLE_ONLY"} onClick={() => { setFulfillmentType("TABLE_ONLY"); setError(""); setOfferPreview(null); }}><span className="booking-intent-icon"><CalendarDays size={18}/></span><strong>Reservation only</strong><small>Book a table and order food at the restaurant.</small></button></div>
                {fulfillmentType === "PREORDER" && <div className="booking-preorder-panel"><h3>Choose preorder items</h3>{menuLoading ? <p>Loading menu…</p> : menuCategories.length === 0 ? <p>The restaurant menu is unavailable for preorder right now.</p> : menuCategories.map((category) => { const foods = (category.foods || []).filter((food) => food.is_available && (food.variants || []).some((variant) => variant.is_available)); return foods.length ? <div className="booking-preorder-category" key={category.id}><h4>{category.name}</h4>{foods.map((food) => <article className="booking-preorder-food" key={food.id}>{food.image_url && <img src={food.image_url} alt=""/>}<div className="booking-preorder-food-copy"><strong>{food.name}</strong>{food.description && <small>{food.description}</small>}{(food.variants || []).filter((variant) => variant.is_available).map((variant) => { const quantity = preorderCart.find((line) => line.variant_id === variant.id)?.quantity || 0; return <div className="booking-preorder-variant" key={variant.id}><span>{variant.name} · ₹{Number(variant.price).toFixed(2)}</span><div>{quantity > 0 && <button type="button" aria-label={`Remove one ${food.name}`} onClick={() => changePreorderQuantity(variant.id, -1)}><Minus size={13}/></button>}<strong>{quantity || ""}</strong><button type="button" aria-label={`Add one ${food.name}`} onClick={() => changePreorderQuantity(variant.id, 1)}><Plus size={13}/></button></div></div>; })}</div></article>)}</div> : null; })}</div>}
              </section>
              <section className="booking-slots-panel"><h3>Available time slots</h3><p className="booking-hours-message">Choose a 30-minute reservation start time. Each slot reflects current table availability for {guests} {guests === 1 ? "guest" : "guests"}.</p>{selectedDateException && <p className="booking-hours-message">Special schedule: {selectedDateException.is_closed ? "Closed" : selectedDateException.periods.map((period) => `${period.opens}–${period.closes}`).join(" · ")}{selectedDateException.reason ? ` · ${selectedDateException.reason}` : ""}</p>}{timeSlotsLoading ? <p className="booking-hours-message">Checking available times…</p> : <div className="booking-time-slots" role="group" aria-label="Available reservation times">{Object.keys(availability).map((slot) => <SlotButton key={slot} slot={displayTime(slot)} selected={time === slot} availability={availability[slot]} onClick={() => { setTime(slot); setSelectedTableId(""); }} />)}</div>}{!timeSlotsLoading && !Object.keys(availability).length && <p className="reservation-page-error">{selectedDateException?.is_closed ? `The restaurant is closed on this date.${selectedDateException.reason ? ` ${selectedDateException.reason}` : ""}` : date <= todayInRestaurantTimezone() ? "No same-day reservations. Choose a future date." : "No reservation times are available for this date."}</p>}{availabilityError && <p className="reservation-page-error">{availabilityError}</p>}</section>
            </>}

            {step === 2 && <section className="booking-table-panel"><span className="booking-step-label">RESERVATION STEP 2 OF 3</span><h2>Select Your Table Setup</h2><p>Suggested tables for {selectedDateLabel} at {displayTime(time)} · {guests} guests</p><div className="booking-table-legend"><span>Available</span><span>Selected</span><span>Unavailable</span></div><div className="booking-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={selectedTableId === table.id ? "selected" : ""} onClick={() => setSelectedTableId(table.id)}><span className="booking-table-bullet">{selectedTableId === table.id ? <Check size={15} /> : null}</span><span><strong>{table.table_ids.length > 1 ? `${table.table_ids.length} tables together` : `Table ${table.table_number}`}</strong><small>{table.floor_name} · Tables {table.table_number} · Seats up to {table.capacity} · {table.table_type}</small></span><b>₹{Number(table.reservation_fee).toFixed(2)}</b></button>)}</div><button type="button" className="booking-back-button" onClick={() => setStep(1)}>Back to date & time</button></section>}

            {step === checkoutStep && <section className="booking-checkout-panel">
              <header className="booking-checkout-heading"><span className="booking-step-label">RESERVATION STEP {checkoutStep} OF 3</span><h2>Checkout</h2><p>Review your visit and payment details before confirming.</p></header>
              <section className="booking-checkout-payment" aria-labelledby="checkout-payment-title">
                <div className="booking-checkout-section-heading"><div><span className="booking-checkout-kicker">PAYMENT</span><h3 id="checkout-payment-title">Reservation fee</h3></div><span className="booking-checkout-due">Required · Pay now</span></div>
                <div className="booking-payment-methods" role="group" aria-label="Choose payment method">
                  <button type="button" className={`booking-payment-option${paymentMethod === "WALLET" ? " selected" : ""}`} aria-pressed={paymentMethod === "WALLET"} onClick={() => selectPaymentMethod("WALLET")}><Wallet size={19} /><span><strong>DineBook wallet</strong><small>{walletLoading ? "Checking balance…" : `Available balance ₹${walletBalance.toFixed(2)}`}</small></span></button>
                  <button type="button" className={`booking-payment-option${paymentMethod === "RAZORPAY" ? " selected" : ""}`} aria-pressed={paymentMethod === "RAZORPAY"} onClick={() => selectPaymentMethod("RAZORPAY")}><CreditCard size={19} /><span><strong>Pay online</strong><small>Cards, UPI and net banking via Razorpay</small></span></button>
                </div>
                <div className="booking-required-fee"><div><strong>Reservation fee</strong><small>{paymentMethod === "WALLET" ? "Charged from your DineBook wallet" : "Secure checkout hosted by Razorpay"}</small></div><b>₹{quotedFee.toFixed(2)}</b></div>
                {fulfillmentType === "PREORDER" && <div className="booking-preorder-payment"><strong>Preorder payment</strong><p>Pay at the restaurant, or use the same method selected for the reservation.</p><div className="booking-payment-methods" role="group" aria-label="Preorder payment method"><button type="button" className={`booking-payment-option booking-payment-option-desk${preorderPaymentMethod === "PAY_AT_DESK" ? " selected" : ""}`} aria-pressed={preorderPaymentMethod === "PAY_AT_DESK"} onClick={() => setPreorderPaymentMethod("PAY_AT_DESK")}><span><strong>Pay at restaurant</strong><small>Food total due when you dine</small></span></button><button type="button" className={`booking-payment-option${preorderPaymentMethod === paymentMethod ? " selected" : ""}`} aria-pressed={preorderPaymentMethod === paymentMethod} onClick={() => setPreorderPaymentMethod(paymentMethod)}>{paymentMethod === "WALLET" ? <Wallet size={19}/> : <CreditCard size={19}/>}<span><strong>{paymentMethod === "WALLET" ? "Pay from wallet" : "Pay online with Razorpay"}</strong><small>{paymentMethod === "WALLET" ? "Charge food total from your wallet now" : "Reservation and food are paid in one checkout"}</small></span></button></div></div>}
                {fulfillmentType === "PREORDER" && <div className="booking-offers-checkout"><strong>Offers for your preorder</strong>{relevantOffers.length ? relevantOffers.map((offer) => <article key={offer.id}><div><b>{offer.title}</b><span>{offer.discount_type === "PERCENTAGE" ? `${offer.discount_percent}% off${offer.max_discount ? ` up to ₹${Number(offer.max_discount).toFixed(2)}` : ""}` : `₹${Number(offer.discount_percent).toFixed(2)} off`}</span><small>{offer.code} · Minimum ₹{Number(offer.minimum_subtotal).toFixed(2)}</small></div><button type="button" disabled={offerBusy} onClick={() => previewPreorderOffer(offer.code)}>{offerPreview?.valid && offerPreview.offer.id === offer.id ? "Applied" : "Apply"}</button></article>) : <small>No active offers match the selected preorder items.</small>}<div className="booking-offer-code"><input aria-label="Offer code" placeholder="Enter offer code" value={offerCode} onChange={(event) => { setOfferCode(event.target.value.toUpperCase()); setOfferPreview(null); }} /><button type="button" disabled={offerBusy} onClick={() => previewPreorderOffer()}>{offerBusy ? "Checking…" : "Apply code"}</button></div>{offerPreview?.valid && <small className="booking-offer-success">{offerPreview.offer.title} applied · save ₹{Number(offerPreview.discount_amount).toFixed(2)}</small>}</div>}
                <div className="booking-required-fee"><div><strong>Reservation fee</strong><small>{paymentMethod === "WALLET" ? "Charged from your DineBook wallet" : "Secure checkout hosted by Razorpay"}</small></div><b>₹{quotedFee.toFixed(2)}</b></div>
                {walletRequired > 0 && !walletLoading && walletBalance < walletRequired && <p className="booking-wallet-warning">Add ₹{(walletRequired - walletBalance).toFixed(2)} to your wallet to cover the selected wallet payments.</p>}

              </section>
              <section className="booking-checkout-summary" aria-labelledby="checkout-summary-title">
                <div className="booking-checkout-section-heading"><div><span className="booking-checkout-kicker">YOUR VISIT</span><h3 id="checkout-summary-title">Reservation details</h3></div><span className="booking-detail-step">{fulfillmentType === "PREORDER" ? "WITH PREORDER" : "TABLE ONLY"}</span></div>
                <div className="booking-checkout-visit-grid">
                  <div><CalendarDays /><span>Date</span><strong>{selectedDateLabel}</strong></div>
                  <div><Clock3 /><span>Time</span><strong>{displayTime(time)}</strong></div>
                  <div><Users /><span>Party</span><strong>{guests} {guests === 1 ? "guest" : "guests"}</strong></div>
                  <div><MapPin /><span>Table</span><strong>{selectedTable?.floor_name} · {selectedTable?.table_number}</strong></div>
                </div>
                <div className="booking-checkout-costs">
                  <div className="booking-checkout-cost-line"><span>Table reservation fee</span><strong>₹{quotedFee.toFixed(2)}</strong></div>
                  {fulfillmentType === "PREORDER" && <><div className="booking-checkout-cost-line"><span>Preorder subtotal</span><strong>₹{preorderSubtotal.toFixed(2)}</strong></div>{offerPreview?.valid && <div className="booking-checkout-cost-line"><span>Offer discount · {offerCode}</span><strong>−₹{Number(offerPreview.discount_amount).toFixed(2)}</strong></div>}<div className="booking-checkout-cost-line"><span>GST ({orderTaxPercent}%)</span><strong>₹{preorderTaxAmount.toFixed(2)}</strong></div><div className="booking-checkout-cost-line"><span>Food total including GST · {preorderPaymentMethod === "WALLET" ? "wallet" : preorderPaymentMethod === "RAZORPAY" ? "Razorpay" : "pay at restaurant"}</span><strong>₹{preorderTotalWithTax.toFixed(2)}</strong></div></>}
                  <div className="booking-checkout-grand-total"><span>Booking total<small>{paymentMethod === "WALLET" ? "Reservation fee paid from wallet" : "Reservation fee paid online"}{fulfillmentType === "PREORDER" ? ` · food ${preorderPaymentMethod === "WALLET" ? "paid from wallet" : preorderPaymentMethod === "RAZORPAY" ? "paid online" : "due at restaurant"}` : ""}</small></span><strong>₹{checkoutTotal.toFixed(2)}</strong></div>
                </div>
              </section>
              <div className="booking-checkout-actions"><button type="button" className="booking-back-button" onClick={() => setStep(2)}>Back</button></div>
            </section>}
            {step === resultStep && reservation && (reservationPaymentFailed ? <section className="booking-result-panel booking-payment-failed-panel"><span className="booking-step-label">PAYMENT NOT COMPLETED</span><div className="booking-result-icon failed" aria-hidden="true">×</div><h2>Reservation cancelled</h2><p>{paymentFailureMessage || "Payment failed. Please try again later."}</p><div className="booking-payment-note"><strong>{paymentWasCancelled ? "Payment cancelled" : "Payment failed"}</strong><p>No reservation pass was issued. Please try again or choose another payment method.</p></div><button type="button" className="booking-primary-action" onClick={() => { setPaymentFailureMessage(""); setReservation(null); setSelectedTableId(""); setError(""); setAvailabilityRefreshKey((current) => current + 1); setStep(1); }}>Try again</button><Link to={`/customer/restaurants/${restaurantId}`} className="booking-back-button">Back to restaurant</Link></section> : <section className="booking-result-panel"><span className="booking-step-label">{reservation.status === "CONFIRMED" ? "RESERVATION PASS" : "PAYMENT STATUS"}</span><div className={`booking-result-icon ${reservation.status === "CONFIRMED" ? "paid" : "pending"}`}>{reservation.status === "CONFIRMED" ? "✓" : "!"}</div><h2>{reservation.status === "CONFIRMED" ? "Reservation Confirmed" : "Reservation Request Received"}</h2><p>{reservation.status === "CONFIRMED" ? "Your reservation fee is paid. Show this QR pass at the restaurant when you arrive. Food orders are handled by the manager at reception." : "Payment is awaiting confirmation. Refresh this page to check the latest status."}</p>{reservation.status === "CONFIRMED" && <><div className="booking-pass-layout"><div className="booking-review-lines"><ReviewLine label="Reservation code" value={reservationCode(reservation)} /><ReviewLine label="Date & time" value={`${reservation.reservation_date} · ${shortTime(reservation.start_time)}`} /><ReviewLine label="Table" value={reservation.tables?.map((table) => `${table.floor_name} · ${table.table_number}`).join(", ") || "Pending"} /><ReviewLine label="Guests" value={`${reservation.number_of_guests}`} /><ReviewLine label="Reservation fee" value={`₹${Number(reservation.fee_amount).toFixed(2)}`} /><ReviewLine label="Reservation payment" value={reservationPaymentLabel(reservation)} bold />{reservation.fulfillment_type === "PREORDER" && <><ReviewLine label="Preorder subtotal" value={`₹${(Number(reservation.preorder_total || 0) - Number(reservation.preorder_tax_amount || 0) + Number(reservation.preorder_discount || 0)).toFixed(2)}`} /><ReviewLine label={`GST (${Number(reservation.preorder_tax_percent || 0)}%)`} value={`₹${Number(reservation.preorder_tax_amount || 0).toFixed(2)}`} /><ReviewLine label="Preorder total" value={`₹${Number(reservation.preorder_total || 0).toFixed(2)}`} /><ReviewLine label="Preorder payment" value={preorderPaymentLabel(reservation)} bold /></>}{reservation.razorpay_payment_id && <ReviewLine label="Payment reference" value={reservation.razorpay_payment_id} />}</div><div className="booking-qr-card"><div className="booking-qr-caption"><span>RESERVATION CODE</span><strong>{reservationCode(reservation)}</strong></div>{qrCode ? <img src={qrCode} alt="QR code for reservation ID" /> : <span className="booking-qr-placeholder">{qrError || "Generating QR…"}</span>}<small>Scan to look up this reservation at the restaurant.</small><a className={`booking-download-pass${passDownload ? " ready" : ""}`} href={passDownload || undefined} download={`DineBook-pass-${reservationCode(reservation)}.png`} aria-disabled={!passDownload}>{passDownload ? "Download reservation pass" : "Preparing download…"}</a></div></div>{qrError && <p className="reservation-page-error">{qrError}</p>}</>}<button type="button" className="booking-back-button" onClick={async () => { try { const latest = await requestJson(`/api/customer/reservations/${reservation.id}`); setReservation(latest); } catch (reason) { setError(reason.message); } }}>{reservation.status === "CONFIRMED" ? "Refresh reservation status" : "Check payment status"}</button> <Link to={`/customer/restaurants/${restaurantId}`} className="booking-back-button">Back to restaurant</Link></section>)}
          </section>

          <aside className="booking-summary-column"><section className="booking-summary-card"><span className="booking-step-label">RESERVATION STEP {step} OF 3</span><h2>{step === 1 ? "Booking Summary" : step === 2 ? "Dine-in Details" : step === checkoutStep ? "Checkout Summary" : step === resultStep ? "Reservation Status" : "Reservation Summary"}</h2><div className="booking-summary-lines"><ReviewLine label="Selected date" value={selectedDateLabel} /><ReviewLine label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} /><ReviewLine label="Preferred time" value={displayTime(time)} />{step >= 2 && <ReviewLine label="Selected table" value={selectedTable ? `Table ${selectedTable.table_number}` : "Choose a table"} />}<ReviewLine label={step === resultStep && reservation?.payment_status === "PAID" ? "Table reservation fee · Paid" : "Table reservation fee"} value={selectedAvailability.loading && step === 1 ? "Checking…" : `₹${quotedFee.toFixed(2)}`} />{fulfillmentType === "PREORDER" && <>{offerPreview?.valid && <><ReviewLine label="Original preorder amount" value={`₹${preorderSubtotal.toFixed(2)}`} /><ReviewLine label={`Offer discount · ${offerPreview.offer.title}`} value={`−₹${Number(offerPreview.discount_amount).toFixed(2)}`} /></>}<ReviewLine label={`GST (${orderTaxPercent}%)`} value={`₹${step === resultStep ? Number(reservation?.preorder_tax_amount || 0).toFixed(2) : preorderTaxAmount.toFixed(2)}`} /><ReviewLine label="Preorder total including GST" value={`₹${step === resultStep ? Number(reservation?.preorder_total || 0).toFixed(2) : preorderTotalWithTax.toFixed(2)}`} /></>}<ReviewLine label={step >= checkoutStep ? "Checkout total" : "Current total"} value={`₹${summaryCheckoutTotal.toFixed(2)}`} bold /></div>{step === 1 && <button type="button" className="booking-primary-action" disabled={selectedAvailability.loading || !availableTables.length || (fulfillmentType === "PREORDER" && (menuLoading || preorderCart.length === 0))} onClick={continueToTables}>{selectedAvailability.loading ? "Checking table availability…" : fulfillmentType === "PREORDER" && preorderCart.length === 0 ? "Add preorder items to continue" : !availableTables.length ? "No tables available" : "Continue to Table Selection"}</button>}{step === 2 && <button type="button" className="booking-primary-action" disabled={!selectedTable || (fulfillmentType === "PREORDER" && preorderCart.length === 0)} onClick={continueFromTable}>Continue</button>}{step === checkoutStep && <button type="button" className="booking-primary-action" disabled={busy || (walletRequired > 0 && (walletLoading || walletBalance < walletRequired)) || (fulfillmentType === "PREORDER" && preorderCart.length === 0) || offerBusy} onClick={submitReservation}>{busy ? "Submitting…" : paymentMethod === "RAZORPAY" ? "Continue to secure payment" : "Confirm reservation"}</button>}{step === resultStep && <Link to="/customer/restaurants" className="booking-primary-action booking-link-action">Explore restaurants</Link>}</section><p className="booking-summary-footnote">Choose wallet or securely pay online with Razorpay. Preorder food can be paid now or at the restaurant.</p>{error && step > 1 && <p className="reservation-page-error" role="alert">{error}</p>}</aside>
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
