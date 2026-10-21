import { useEffect, useState } from "react";
import { Bell, CalendarDays, ChevronRight, Clock3, CreditCard, Heart, LogOut, UserRound, Users, Wallet, X } from "lucide-react";
import QRCode from "qrcode";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { mergeReservations } from "../../data/customerReservations.js";
import "./CustomerProfilePage.css";

const statusText = (value) => (value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateText = (value) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "Date not set";
const timeText = (value) => { if (!value) return "—"; const [h, m] = value.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const reservationCode = (reservation) => reservation?.reservation_code || `RES-${String(reservation?.id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`;

export function ProfileFrame({ user, children, active = "Booking History", variant = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selected = location.pathname.endsWith("/transactions") ? "Payment Transactions" : location.hash === "#activity" ? "Payment History" : active;
  const items = [["Personal Information", "/customer/profile#personal", UserRound], ["Saved Restaurants", "/customer/saved-restaurants", Heart], ["Booking History", "/customer/profile/reservations", CalendarDays], ["Payment Transactions", "/customer/profile/transactions", CreditCard], ["Notification Settings", "/customer/profile#notifications", Bell], ["Wallet", "/customer/profile/wallet", Wallet]];
  function logout() {
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active") {
      sessionStorage.removeItem(demoSessionKey);
      navigate("/customer/login");
      return;
    }
    requestJson("/api/auth/logout", { method: "POST" }).catch(() => {}).finally(() => navigate("/customer/login"));
  }
  return <div className={`customer-home profile-page db-portal-shell ${variant}`.trim()}><CustomerHeader user={user} /><main className="profile-shell"><nav className="profile-crumb" aria-label="Breadcrumb"><Link to="/customer">Home</Link><span>/</span><Link to="/customer/profile#personal">Account</Link><span>/</span><strong>{selected}</strong></nav><div className="profile-layout"><aside className="profile-sidebar db-portal-surface"><div className="profile-identity"><div className="profile-avatar"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop&crop=faces" alt="" /></div><strong>{user?.name || "Your Profile"}</strong><span>{user?.email || ""}</span></div><div className="profile-menu">{items.map(([label, to, Icon]) => <Link key={label} to={to} className={selected === label ? "selected" : ""}><Icon size={17} />{label}</Link>)}</div><button className="profile-logout" type="button" onClick={logout}><LogOut size={17} />Logout Account</button></aside><div className="profile-content">{children}</div></div></main><LandingFooter /></div>;
}

export default function CustomerReservationsPage() {
  const navigate = useNavigate(); const [user, setUser] = useState(null); const [items, setItems] = useState([]); const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [filter, setFilter] = useState("ALL"); const [restaurantFilter, setRestaurantFilter] = useState("ALL"); const [query, setQuery] = useState(""); const [period, setPeriod] = useState("ALL"); const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState(""); const [sort, setSort] = useState("created-newest"); const [page, setPage] = useState(1); const [selectedPass, setSelectedPass] = useState(null); const [passQr, setPassQr] = useState(""); const [passError, setPassError] = useState(""); const pageSize = 10;
  useEffect(() => { let alive = true; const demo = import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active"; (demo ? Promise.resolve(demoCustomer) : requestJson("/api/customer/me")).then(async (value) => { if (!alive) return; setUser(value); try { const data = await requestJson("/api/customer/reservations"); if (alive) setItems(mergeReservations(data, value.email)); } catch (reason) { const localItems = mergeReservations([], value.email); if (alive) { setItems(localItems); if (!localItems.length) setError(reason.message); } } }).catch(() => alive && navigate("/customer/login", { replace: true })).finally(() => alive && setBusy(false)); return () => { alive = false; }; }, [navigate]);
  async function refreshReservations() {
    if (!user) return;
    const data = await requestJson("/api/customer/reservations");
    setItems(mergeReservations(data, user.email));
  }
  const realtimeStatus = useRealtimeEvents({ enabled: Boolean(user) && !(import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active"), onEvent: refreshReservations, onReconnect: refreshReservations });
  const restaurants = [...new Map(items.map((item) => [item.restaurant_id, { id: item.restaurant_id, name: item.restaurant_name || "Restaurant" }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toLocaleDateString("en-CA");
  const needle = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const haystack = `${item.restaurant_name || ""} ${item.id || ""} ${item.restaurant_location || item.location || ""}`.toLowerCase();
    const date = item.reservation_date || "";
    return (filter === "ALL" || item.status === filter)
      && (restaurantFilter === "ALL" || item.restaurant_id === restaurantFilter)
      && (!needle || haystack.includes(needle))
      && (period === "ALL" || (period === "UPCOMING" ? date >= today : date < today))
      && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  }).sort((a, b) => {
    const createdA = Date.parse(a.created_at || `${a.reservation_date}T${a.start_time}`) || 0;
    const createdB = Date.parse(b.created_at || `${b.reservation_date}T${b.start_time}`) || 0;
    const dateA = Date.parse(`${a.reservation_date || "1970-01-01"}T${a.start_time || "00:00"}`) || 0;
    const dateB = Date.parse(`${b.reservation_date || "1970-01-01"}T${b.start_time || "00:00"}`) || 0;
    if (sort === "created-newest") return createdB - createdA;
    if (sort === "created-oldest") return createdA - createdB;
    return sort === "date-oldest" ? dateA - dateB : dateB - dateA;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)); const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [query, filter, restaurantFilter, period, dateFrom, dateTo, sort]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  function updateFilter(value) { setFilter(value); setPage(1); }
  useEffect(() => {
    if (!selectedPass) { setPassQr(""); setPassError(""); return undefined; }
    let active = true;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSelectedPass(null); };
    document.addEventListener("keydown", closeOnEscape);
    setPassQr(""); setPassError("");
    QRCode.toDataURL(JSON.stringify({ reservation_id: selectedPass.id }), { errorCorrectionLevel: "M", margin: 4, width: 220, color: { dark: "#111111", light: "#ffffff" } })
      .then((value) => { if (active) setPassQr(value); })
      .catch(() => { if (active) setPassError("Could not create this reservation pass."); });
    return () => { active = false; document.removeEventListener("keydown", closeOnEscape); };
  }, [selectedPass]);
  return <ProfileFrame user={user}><section className="profile-card reservation-list-card"><div className="profile-card-title"><h1>Booking History</h1><span>{items.length} RESERVATION{items.length === 1 ? "" : "S"}</span></div><p className="reservation-intro">Review your upcoming plans and past dining experiences.</p><p className={`realtime-status realtime-${realtimeStatus}`} aria-live="polite">{realtimeStatus === "connected" ? "Live reservation updates connected" : realtimeStatus === "reconnecting" ? "Reconnecting to live updates…" : realtimeStatus === "disconnected" ? "Live reservation updates disconnected · Refresh to sync" : "Connecting to live updates…"}</p>{busy ? <p className="profile-empty">Loading reservations…</p> : error ? <p className="profile-empty">{error}</p> : !items.length ? <div className="reservation-empty"><CalendarDays size={30} /><h2>No reservations yet</h2><p>Your table bookings will show up here.</p><Link to="/customer/restaurants">Explore restaurants</Link></div> : <><div className="reservation-toolbar"><label>Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Restaurant, location, or reference" /></label><label>Filter by status<select value={filter} onChange={(event) => updateFilter(event.target.value)}><option value="ALL">All reservations</option><option value="PENDING_PAYMENT">Pending payment</option><option value="CONFIRMED">Confirmed</option><option value="SEATED">Seated</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option><option value="NO_SHOW">No show</option></select></label><label>When<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="ALL">All dates</option><option value="UPCOMING">Upcoming</option><option value="PAST">Past</option></select></label><label>From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label>Restaurant<select value={restaurantFilter} onChange={(event) => { setRestaurantFilter(event.target.value); setPage(1); }}><option value="ALL">All restaurants</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></label><label>Sort by<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="created-newest">Created: newest first</option><option value="created-oldest">Created: oldest first</option><option value="date-newest">Reservation: latest first</option><option value="date-oldest">Reservation: earliest first</option></select></label><span className="reservation-result-count">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span><button type="button" onClick={() => { setQuery(""); setFilter("ALL"); setRestaurantFilter("ALL"); setPeriod("ALL"); setDateFrom(""); setDateTo(""); setSort("created-newest"); }}>Clear filters</button></div>{visible.length ? <div className="reservation-list">{visible.map((item) => <article className="reservation-row" key={item.id}><div className="reservation-date-icon"><CalendarDays size={20} /><span>{new Date(`${item.reservation_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><div className="reservation-row-main"><strong>Reservation at {item.restaurant_name || "DineBook Restaurant"}</strong><span><Clock3 size={14} />{dateText(item.reservation_date)} · {timeText(item.start_time)}</span><span><Users size={14} />{item.number_of_guests} guests · Tables {item.tables?.map((table) => table.table_number).join(", ") || "—"}</span>{item.food_orders?.map((order) => <span className="reservation-order-status" key={order.id}>Food order · {statusText(order.status)} · ₹{Number(order.total).toFixed(2)}</span>)}</div><div className="reservation-row-side"><span className={`reservation-status ${item.status?.toLowerCase()}`}>{statusText(item.status)}</span><div className="reservation-row-actions"><button type="button" onClick={() => setSelectedPass(item)}>View pass</button><Link to={`/customer/profile/reservations/${item.id}`}>View details <ChevronRight size={15} /></Link></div></div></article>)}</div> : <div className="reservation-empty compact"><h2>No matching reservations</h2><p>Try changing the restaurant or status filter.</p></div>}{filtered.length > 0 && <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} label="reservations" showPageNumbers />}</>}</section>{selectedPass && <div className="reservation-pass-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPass(null); }}><section className="reservation-pass-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-pass-title"><button className="reservation-pass-close" type="button" aria-label="Close reservation pass" onClick={() => setSelectedPass(null)}><X size={18} /></button><span className="reservation-pass-eyebrow">DINEBOOK RESERVATION PASS</span><h2 id="reservation-pass-title">{selectedPass.restaurant_name || "Restaurant"}</h2><p>{dateText(selectedPass.reservation_date)} · {timeText(selectedPass.start_time)}</p>{passQr ? <img className="reservation-pass-qr" src={passQr} alt="QR code containing this reservation ID" /> : <div className="reservation-pass-qr-placeholder">{passError || "Preparing pass…"}</div>}<span className="reservation-pass-id-label">RESERVATION CODE</span><strong className="reservation-pass-id">{reservationCode(selectedPass)}</strong><div className="reservation-pass-meta"><span>{selectedPass.number_of_guests} guests</span><span>{selectedPass.tables?.length ? `Table ${selectedPass.tables.map((table) => table.table_number).join(", ")}` : "Table pending"}</span><span>{statusText(selectedPass.status)}</span></div>{passQr && <a className="reservation-pass-download" href={passQr} download={`DineBook-${reservationCode(selectedPass)}-QR.png`}>Download QR</a>}</section></div>}</ProfileFrame>;
}
