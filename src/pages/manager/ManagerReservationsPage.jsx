import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { requestJson } from "../../lib/authApi.js";
import jsQR from "jsqr";
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState("");
  const [foodReservation, setFoodReservation] = useState(null);
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
  const reservationIdQuery = query.trim().toLowerCase();
  const idMatches = reservationIdQuery.length >= 6
    ? items.filter((item) => item.id.toLowerCase().replaceAll("-", "").startsWith(reservationIdQuery.replaceAll("-", "")))
    : [];
  const isReservationIdLookup = idMatches.length > 0;
  const selectedItems = useMemo(() => {
    if (isReservationIdLookup) return idMatches;
    return items.filter((item) => {
      if (item.reservation_date !== selectedDate) return false;
      if (tableFilter !== "all" && !item.tables.some((table) => table.id === tableFilter)) return false;
      const haystack = `${item.customer_name} ${item.customer_email || ""} ${item.tables.map((table) => table.table_number).join(" ")}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [items, selectedDate, tableFilter, query, isReservationIdLookup, idMatches]);
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
            <p>View and manage all table reservations</p>
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
                        <strong>Reservation ID · {item.id.slice(0, 8).toUpperCase()}</strong>
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
                        <strong>{item.fulfillment_type === "PREORDER" ? `Preorder · ₹${Number(item.preorder_total || 0).toFixed(2)}` : "Table reservation only"} · Pay at desk · Total ₹{(Number(item.fee_amount) + Number(item.preorder_total || 0)).toFixed(2)}</strong>
                        {item.preorder_items?.length > 0 && <ul>{item.preorder_items.map((food) => <li key={food.variant_id}>{food.quantity} × {food.food_name} · {food.variant_name} — ₹{Number(food.line_total).toFixed(2)}</li>)}</ul>}
                        {item.special_request && <p>{item.special_request}</p>}
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
                : `This records ₹${(Number(pendingAction.item.fee_amount) + Number(pendingAction.item.preorder_total || 0)).toFixed(2)} received at the desk and confirms the booking for ${pendingAction.item.customer_name}.`}
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
      {scannerOpen && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-pass-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-pass-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setScannerOpen(false)} aria-label="Close scanner"><X size={18}/></button><div className="manager-reservation-confirm-icon success"><QrCode size={21}/></div><h3 id="reservation-pass-title">Verify reservation pass</h3><p>Scan the customer’s QR pass, upload a pass image, or enter its reservation ID.</p><video ref={videoRef} className={`reservation-camera-preview${cameraActive ? " active" : ""}`} muted playsInline /> <div className="reservation-pass-controls"><button type="button" onClick={async () => { setScanError(""); try { const detector = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null; const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); cameraRef.current = stream; scanActiveRef.current = true; videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraActive(true); const canvas = document.createElement("canvas"); const context = canvas.getContext("2d", { willReadFrequently: true }); const scanFrame = async () => { if (!scanActiveRef.current) return; try { let value = ""; if (detector) value = (await detector.detect(videoRef.current))[0]?.rawValue || ""; else if (videoRef.current.videoWidth) { canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight; context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); value = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" })?.data || ""; } if (value) { scanActiveRef.current = false; stream.getTracks().forEach((track) => track.stop()); cameraRef.current = null; setCameraActive(false); verifyPass(value); return; } } catch { /* Wait for the next camera frame. */ } window.setTimeout(scanFrame, 450); }; scanFrame(); } catch (e) { setScanError(e.message || "Camera access failed. Upload the pass image or enter its ID."); } }}><QrCode size={16}/> Use camera</button><label><Upload size={16}/> Upload pass<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(bitmap, 0, 0); const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" }); if (!code?.data) throw new Error("No reservation QR code was found in that image."); await verifyPass(code.data); } catch (e) { setScanError(e.message); } finally { event.target.value = ""; } }}/></label></div><form onSubmit={(event) => { event.preventDefault(); verifyPass(scanValue); }} className="reservation-pass-id-form"><input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Reservation ID" aria-label="Reservation ID"/><button type="submit" disabled={scanBusy || !scanValue.trim()}>{scanBusy ? "Verifying…" : "Verify ID"}</button></form>{scanError && <div className="reservation-error" role="alert">{scanError}</div>}</section></div>}
      {foodReservation && <div className="manager-reservation-confirm-backdrop" role="presentation"><section className="manager-reservation-confirm reservation-food-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-food-title"><button type="button" className="manager-reservation-confirm-close" onClick={() => setFoodReservation(null)} aria-label="Close food editor"><X size={18}/></button><h3 id="reservation-food-title">Add preorder food</h3><p>Add dishes to this reservation before confirming. The updated total will appear in reservation details.</p>{menuBusy ? <p>Loading menu…</p> : availableVariants.length === 0 ? <p>No available menu items right now.</p> : <form onSubmit={addFood} className="reservation-food-form"><label>Menu item<select value={variantId} onChange={(event) => setVariantId(event.target.value)} required><option value="">Choose a dish</option>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.foodName} · {variant.name} — ₹{Number(variant.price).toFixed(2)}</option>)}</select></label><label>Quantity<input type="number" min="1" max="99" value={foodQuantity} onChange={(event) => setFoodQuantity(event.target.value)} required/></label><div className="manager-reservation-confirm-actions"><button type="button" className="confirm-dismiss" onClick={() => setFoodReservation(null)}>Cancel</button><button type="submit" className="confirm-success" disabled={!variantId || busyId === foodReservation.id}>{busyId === foodReservation.id ? "Adding…" : "Add to reservation"}</button></div></form>}</section></div>}
    </ManagerLayout>
  );
}
