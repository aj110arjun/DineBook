import { usePageState } from "../../state/usePageState.js";
import { formatWallTime, formatLocalDate } from "../../lib/localDate.js";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { clearCustomerSession } from "../../state/customerSession.js";
import {
  Settings,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  LogOut,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import "../../assets/css/CustomerProfilePage.css";

const statusText = (value) =>
  (value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateText = (value) => value ? formatLocalDate(value) : "Date not set";
const timeText = (value) => formatWallTime(value);
const reservationCode = (reservation) =>
  reservation?.reservation_code ||
  `RES-${String(reservation?.id || "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase()}`;

export function ProfileFrame({
  user,
  children,
  active = "Booking History",
  variant = "",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selected = location.pathname.endsWith("/transactions")
    ? "Payment Transactions"
    : location.hash === "#activity"
      ? "Payment History"
      : active;
  const items = [
    ["Personal Information", "/customer/profile#personal", UserRound],
    ["Saved Restaurants", "/customer/saved-restaurants", Heart],
    ["Booking History", "/customer/profile/reservations", CalendarDays],
    ["Payment Transactions", "/customer/profile/transactions", CreditCard],
    ["Settings", "/customer/settings", Settings],
    ["Wallet", "/customer/profile/wallet", Wallet],
  ];
  function logout() {
    if (
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active"
    ) {
      sessionStorage.removeItem(demoSessionKey);
      dispatch(clearCustomerSession());
      navigate("/customer/login");
      return;
    }
    requestJson("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        dispatch(clearCustomerSession());
        navigate("/customer/login");
      });
  }
  return (
    <div
      className={`customer-home profile-page db-portal-shell ${variant}`.trim()}
    >
      <CustomerHeader user={user} />
      <main className="profile-shell">
        <nav className="profile-crumb" aria-label="Breadcrumb">
          <Link to="/customer">Home</Link>
          <span>/</span>
          <Link to="/customer/profile#personal">Account</Link>
          <span>/</span>
          <strong>{selected}</strong>
        </nav>
        <div className="profile-layout">
          <aside className="profile-sidebar db-portal-surface">
            <div className="profile-identity">
              <div className="profile-avatar">
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : <span aria-hidden="true">{user?.name?.slice(0, 1) || "D"}</span>}
              </div>
              <strong>{user?.name || "Your Profile"}</strong>
              <span>{user?.email || ""}</span>
            </div>
            <div className="profile-menu">
              {items.map(([label, to, Icon]) => (
                <Link
                  key={label}
                  to={to}
                  className={selected === label ? "selected" : ""}
                  aria-current={selected === label ? "page" : undefined}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </div>
            <button className="profile-logout" type="button" onClick={logout}>
              <LogOut size={17} />
              Logout Account
            </button>
          </aside>
          <div className="profile-content">{children}</div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function CustomerReservationsPage() {
  const navigate = useNavigate();
  const [
    {
      user, items, total, restaurants, busy, error, filter, restaurantFilter,
      query, period, dateFrom, dateTo, sort, page, selectedPass,
    },
    {
      user: setUser, items: setItems, total: setTotal,
      restaurants: setRestaurants, busy: setBusy, error: setError,
      filter: setFilter, restaurantFilter: setRestaurantFilter, query: setQuery,
      period: setPeriod, dateFrom: setDateFrom, dateTo: setDateTo, sort: setSort,
      page: setPage, selectedPass: setSelectedPass,
    },
  ] = usePageState("CustomerReservationsPage", () => ({
    user: null,
    items: [],
    total: 0,
    restaurants: [],
    busy: true,
    error: "",
    filter: "ALL",
    restaurantFilter: "ALL",
    query: "",
    period: "ALL",
    dateFrom: "",
    dateTo: "",
    sort: "created-newest",
    page: 1,
    selectedPass: null,
  }));
  const [passQr, setPassQr] = useState("");
  const [
    { passError },
    { passError: setPassError },
  ] = usePageState("CustomerReservationsPage", () => ({
    passError: "",
  }));
  const pageSize = 10;
  const requestSequence = useRef(0);
  const realtimeStartedAt = useRef(Date.now());
  const realtimeRefreshTimer = useRef(null);
  const [
    { realtimeReloadKey },
    { realtimeReloadKey: setRealtimeReloadKey },
  ] = usePageState("CustomerReservationsPage", () => ({
    realtimeReloadKey: 0,
  }));

  useEffect(() => {
    return () => {
      window.clearTimeout(realtimeRefreshTimer.current);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const demo =
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active";
    (demo ? Promise.resolve(demoCustomer) : requestJson("/api/customer/me"))
      .then(async (value) => {
        if (!alive) return;
        setUser(value);
      })
      .catch(() => alive && navigate("/customer/login", { replace: true }))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [navigate]);

  function scheduleReservationRefresh() {
    window.clearTimeout(realtimeRefreshTimer.current);
    realtimeRefreshTimer.current = window.setTimeout(() => {
      realtimeRefreshTimer.current = null;
      setRealtimeReloadKey((current) => current + 1);
    }, 300);
  }

  async function refreshReservations() {
    if (!user) return;
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError("");
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
      search: query,
      status: filter,
      period,
      sort,
      today: new Date().toLocaleDateString("en-CA"),
    });
    if (restaurantFilter !== "ALL")
      params.set("restaurant_id", restaurantFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    try {
      const data = await requestJson(`/api/customer/reservations?${params}`);
      if (sequence !== requestSequence.current) return;
      setItems(data.items);
      setTotal(data.total);
      setRestaurants(data.restaurants);
    } catch (reason) {
      if (sequence === requestSequence.current) setError(reason.message);
    } finally {
      if (sequence === requestSequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    refreshReservations();
    return () => {
      requestSequence.current += 1;
    };
  }, [
    user,
    page,
    query,
    filter,
    restaurantFilter,
    period,
    dateFrom,
    dateTo,
    sort,
    realtimeReloadKey,
  ]);
  const realtimeStatus = useRealtimeEvents({
    enabled:
      Boolean(user) &&
      !(
        import.meta.env.DEV &&
        sessionStorage.getItem(demoSessionKey) === "active"
      ),
    onEvent: (event) => {
      if (!event) return;

      const occurredAt = event.occurred_at;
      const eventTime = occurredAt
        ? Date.parse(
            /(?:Z|[+-]\d{2}:\d{2})$/i.test(occurredAt)
              ? occurrredAt
              : `${occurredAt}Z`,
          )
        : NaN;
      if (Number.isFinite(eventTime) && eventTime < realtimeStartedAt.currnet) {
        return;
      }

      const affectsReservations =
        event.event_type === "booking.updated" ||
        (event.event_type === "payement.status_changed" &&
          event.data?.resource_type === "reservation");
      if (affectsReservations) {
        scheduleReservationRefresh();
      }
    },
    onReconnect: scheduleReservationRefresh,
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = items;
  useEffect(() => {
    setPage(1);
  }, [query, filter, restaurantFilter, period, dateFrom, dateTo, sort]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  function updateFilter(value) {
    setFilter(value);
    setPage(1);
  }
  useEffect(() => {
    if (!selectedPass) {
      setPassQr("");
      setPassError("");
      return undefined;
    }
    let active = true;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedPass(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    setPassQr("");
    setPassError("");
    QRCode.toDataURL(JSON.stringify({ reservation_id: selectedPass.id }), {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 220,
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then((value) => {
        if (active) setPassQr(value);
      })
      .catch(() => {
        if (active) setPassError("Could not create this reservation pass.");
      });
    return () => {
      active = false;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedPass]);
  return (
    <ProfileFrame user={user}>
      <section className="profile-card reservation-list-card">
        <div className="profile-card-title">
          <h1>Booking History</h1>
          <span>
            {items.length} RESERVATION{items.length === 1 ? "" : "S"}
          </span>
        </div>
        <p className="reservation-intro">
          Review your upcoming plans and past dining experiences.
        </p>
        <p
          className={`realtime-status realtime-${realtimeStatus}`}
          aria-live="polite"
        >
          {realtimeStatus === "connected"
            ? "Live reservation updates connected"
            : realtimeStatus === "reconnecting"
              ? "Reconnecting to live updates…"
              : realtimeStatus === "disconnected"
                ? "Live reservation updates disconnected · Refresh to sync"
                : "Connecting to live updates…"}
        </p>
        {busy ? (
          <p className="profile-empty">Loading reservations…</p>
        ) : error ? (
          <p className="profile-empty">{error}</p>
        ) : !items.length ? (
          <div className="reservation-empty">
            <CalendarDays size={30} />
            <h2>No reservations yet</h2>
            <p>Your table bookings will show up here.</p>
            <Link to="/customer/restaurants">Explore restaurants</Link>
          </div>
        ) : (
          <>
            <div className="reservation-toolbar">
              <label>
                Search
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Restaurant, location, or reference"
                />
              </label>
              <label>
                Filter by status
                <select
                  value={filter}
                  onChange={(event) => updateFilter(event.target.value)}
                >
                  <option value="ALL">All reservations</option>
                  <option value="PENDING_PAYMENT">Pending payment</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="SEATED">Seated</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NO_SHOW">No show</option>
                </select>
              </label>
              <label>
                When
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                >
                  <option value="ALL">All dates</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="PAST">Past</option>
                </select>
              </label>
              <label>
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
              <label>
                Restaurant
                <select
                  value={restaurantFilter}
                  onChange={(event) => {
                    setRestaurantFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All restaurants</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort by
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="created-newest">Created: newest first</option>
                  <option value="created-oldest">Created: oldest first</option>
                  <option value="date-newest">Reservation: latest first</option>
                  <option value="date-oldest">
                    Reservation: earliest first
                  </option>
                </select>
              </label>
              <span className="reservation-result-count">
                {total} result{total === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("ALL");
                  setRestaurantFilter("ALL");
                  setPeriod("ALL");
                  setDateFrom("");
                  setDateTo("");
                  setSort("created-newest");
                }}
              >
                Clear filters
              </button>
            </div>
            {visible.length ? (
              <div className="reservation-list">
                {visible.map((item) => (
                  <article className="reservation-row" key={item.id}>
                    <div className="reservation-date-icon">
                      <CalendarDays size={20} />
                    </div>
                    <div className="reservation-row-main">
                      <strong>
                        Reservation at{" "}
                        {item.restaurant_name || "DineBook Restaurant"}
                      </strong>
                      <span>
                        <Clock3 size={14} />
                        {dateText(item.reservation_date)} ·{" "}
                        {timeText(item.start_time)}
                      </span>
                      <span>
                        <Users size={14} />
                        {item.number_of_guests} guests · Tables{" "}
                        {item.tables
                          ?.map((table) => table.table_number)
                          .join(", ") || "—"}
                      </span>
                      {item.food_orders?.map((order) => (
                        <span
                          className="reservation-order-status"
                          key={order.id}
                        >
                          Food order · {statusText(order.status)} · ₹
                          {Number(order.total).toFixed(2)}
                        </span>
                      ))}
                    </div>
                    <div className="reservation-row-side">
                      <span
                        className={`reservation-status ${item.status?.toLowerCase()}`}
                      >
                        {statusText(item.status)}
                      </span>
                      <div className="reservation-row-actions">
                        <button
                          type="button"
                          onClick={() => setSelectedPass(item)}
                        >
                          View pass
                        </button>
                        <Link to={`/customer/profile/reservations/${item.id}`}>
                          View details <ChevronRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="reservation-empty compact">
                <h2>No matching reservations</h2>
                <p>Try changing the restaurant or status filter.</p>
              </div>
            )}
            {total > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                label="reservations"
                showPageNumbers
              />
            )}
          </>
        )}
      </section>
      {selectedPass && (
        <div
          className="reservation-pass-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPass(null);
          }}
        >
          <section
            className="reservation-pass-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-pass-title"
          >
            <button
              className="reservation-pass-close"
              type="button"
              aria-label="Close reservation pass"
              onClick={() => setSelectedPass(null)}
            >
              <X size={18} />
            </button>
            <span className="reservation-pass-eyebrow">
              DINEBOOK RESERVATION PASS
            </span>
            <h2 id="reservation-pass-title">
              {selectedPass.restaurant_name || "Restaurant"}
            </h2>
            <p>
              {dateText(selectedPass.reservation_date)} ·{" "}
              {timeText(selectedPass.start_time)}
            </p>
            {passQr ? (
              <img
                className="reservation-pass-qr"
                src={passQr}
                alt="QR code containing this reservation ID"
              />
            ) : (
              <div className="reservation-pass-qr-placeholder">
                {passError || "Preparing pass…"}
              </div>
            )}
            <span className="reservation-pass-id-label">RESERVATION CODE</span>
            <strong className="reservation-pass-id">
              {reservationCode(selectedPass)}
            </strong>
            <div className="reservation-pass-meta">
              <span>{selectedPass.number_of_guests} guests</span>
              <span>
                {selectedPass.tables?.length
                  ? `Table ${selectedPass.tables.map((table) => table.table_number).join(", ")}`
                  : "Table pending"}
              </span>
              <span>{statusText(selectedPass.status)}</span>
            </div>
            {passQr && (
              <a
                className="reservation-pass-download"
                href={passQr}
                download={`DineBook-${reservationCode(selectedPass)}-QR.png`}
              >
                Download QR
              </a>
            )}
          </section>
        </div>
      )}
    </ProfileFrame>
  );
}
