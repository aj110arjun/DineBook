import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { mergeReservations, saveReservation } from "../../data/customerReservations.js";
import { photo } from "../../data/landingData.js";

const timeOptions = ["7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];
const detailTabs = [
  { id: "about", label: "About" },
  { id: "amenities", label: "Amenities" },
  { id: "menu-preview", label: "Menu" },
  { id: "reviews", label: "Reviews" },
  { id: "reservations", label: "Reservations" },
];

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function CustomerRestaurantDetailsPage() {
  const { restaurantId, section } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(localDateValue);
  const [guests, setGuests] = useState("2");
  const [time, setTime] = useState("8:00 PM");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [reservationStatusFilter, setReservationStatusFilter] = useState("ALL");
  const [reservationDateFilter, setReservationDateFilter] = useState("");
  const [reservationSort, setReservationSort] = useState("NEWEST");
  const [reservationPage, setReservationPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [reservationResult, setReservationResult] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [floors, setFloors] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = useState("");
  const activeSection = detailTabs.some((tab) => tab.id === section)
    ? section
    : "about";
  const restaurantReservations = myReservations.filter((item) => String(item.restaurant_id) === String(restaurantId));
  const sortedReservations = restaurantReservations
    .filter((item) => reservationStatusFilter === "ALL" || item.status === reservationStatusFilter)
    .filter((item) => !reservationDateFilter || item.reservation_date === reservationDateFilter)
    .sort((a, b) => {
      const aDate = `${a.reservation_date}T${a.start_time}`;
      const bDate = `${b.reservation_date}T${b.start_time}`;
      if (reservationSort === "OLDEST") return aDate.localeCompare(bDate);
      if (reservationSort === "FEE_LOW") return Number(a.fee_amount) - Number(b.fee_amount);
      if (reservationSort === "FEE_HIGH") return Number(b.fee_amount) - Number(a.fee_amount);
      return bDate.localeCompare(aDate);
    });
  const reservationsPerPage = 4;
  const reservationPageCount = Math.max(1, Math.ceil(sortedReservations.length / reservationsPerPage));
  const currentReservationPage = Math.min(reservationPage, reservationPageCount);
  const pagedReservations = sortedReservations.slice((currentReservationPage - 1) * reservationsPerPage, currentReservationPage * reservationsPerPage);

  useEffect(() => {
    setReservationPage(1);
  }, [reservationStatusFilter, reservationDateFilter, reservationSort]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    requestJson(`/api/customer/restaurants/${restaurantId}`)
      .then((data) => mounted && setRestaurant(data))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    requestJson(`/api/customer/restaurants/${restaurantId}/floors`)
      .then(setFloors)
      .catch(() => setFloors([]));
  }, [restaurantId]);

  useEffect(() => {
    if (activeSection !== "menu-preview") return undefined;
    let mounted = true;
    setMenuLoading(true);
    setMenuError("");
    requestJson(`/api/customer/restaurants/${restaurantId}/menu`)
      .then((data) => {
        if (!mounted) return;
        setMenuCategories(data);
        setSelectedMenuCategoryId((current) =>
          data.some((category) => category.id === current)
            ? current
            : (data[0]?.id ?? ""),
        );
      })
      .catch((reason) => mounted && setMenuError(reason.message))
      .finally(() => mounted && setMenuLoading(false));
    return () => {
      mounted = false;
    };
  }, [restaurantId, activeSection]);

  useEffect(() => {
    if (
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active"
    ) {
      setUser(demoCustomer);
      return;
    }
    let mounted = true;
    requestJson("/api/customer/me")
      .then((data) => mounted && setUser(data))
      .catch(() => mounted && setUser(null));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    requestJson("/api/customer/reservations")
      .then((items) => setMyReservations(mergeReservations(items, user.email)))
      .catch(() => setMyReservations(mergeReservations([], user.email)));
  }, [user]);

  const gallery = restaurant?.images?.length
    ? restaurant.images
    : restaurant?.image
      ? [restaurant.image]
      : [photo("photo-1517248135467-4c7edcad34c4", 1400)];
  async function submitReservation(event) {
    event.preventDefault();
    if (!user) {
      setBookingMessage("Sign in as a customer to reserve a table.");
      return;
    }
    navigate(`/customer/restaurants/${restaurantId}/booking`, { state: { date, guests, time } });
  }

  function reservationStartTime() {
    const [clock, meridiem] = time.split(" ");
    let [hour, minute] = clock.split(":").map(Number);
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  async function confirmReservation() {
    setBookingBusy(true);
    setBookingMessage("");
    try {
      const reservation = await requestJson("/api/customer/reservations", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: restaurant.id, reservation_date: date,
          start_time: reservationStartTime(), number_of_guests: Number(guests), table_id: selectedTableId }),
      });
      saveReservation(user?.email, { ...reservation, restaurant_name: restaurant.name, restaurant_location: restaurant.location || restaurant.address });
      setReservationResult(reservation);
      setMyReservations((current) => [reservation, ...current.filter((item) => item.id !== reservation.id)]);
      setBookingStep(4);
    } catch (reason) {
      setBookingMessage(reason.message);
      if (reason.message.toLowerCase().includes("no suitable table") || reason.message.toLowerCase().includes("no longer available")) {
        setBookingStep(1);
        setAvailableTables([]);
      }
    } finally {
      setBookingBusy(false);
    }
  }

  function resetReservationFlow() {
    setBookingStep(1);
    setAvailableTables([]);
    setSelectedTableId("");
    setReservationResult(null);
    setBookingMessage("");
  }

  async function cancelMyReservation(item) {
    try {
      await requestJson(`/api/customer/reservations/${item.id}/cancel`, { method: "POST" });
      const updated = { ...item, status: "CANCELLED" };
      saveReservation(user?.email, updated);
      setMyReservations((current) => current.map((reservation) => reservation.id === item.id ? updated : reservation));
    } catch (reason) {
      setBookingMessage(reason.message);
    }
  }

  return (
    <div className="customer-home">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <main className="restaurant-details-page">
        <nav className="restaurant-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/customer">Home</Link>
          <span>/</span>
          <Link to="/customer#restaurants-near-you">Restaurants</Link>
          <span>/</span>
          {restaurant ? (
            <>
              <strong>{restaurant.name}</strong>
            </>
          ) : (
            <span>Restaurant details</span>
          )}
        </nav>

        {loading ? (
          <p className="restaurant-detail-message" role="status">
            Loading restaurant details…
          </p>
        ) : error ? (
          <div className="restaurant-detail-message" role="alert">
            <p>{error}</p>
            <Link to="/customer#restaurants-near-you">
              Return to restaurants
            </Link>
          </div>
        ) : restaurant ? (
          <>
            <div
              className={`restaurant-gallery${gallery.length === 1 ? " single" : gallery.length === 2 ? " two" : ""}`}
            >
              {gallery.slice(0, 3).map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={`restaurant-gallery-image gallery-image-${index + 1}`}
                  style={{ backgroundImage: `url(${image})` }}
                  role="img"
                  aria-label={`${restaurant.name} ${index === 0 ? "interior" : "gallery"}`}
                />
              ))}
            </div>

            <div className={`restaurant-details-layout${activeSection === "reservations" ? " has-booking" : " no-booking"}`}>
              <div className="restaurant-details-main">
                <div className="restaurant-detail-tags">
                  <span>{restaurant.cuisine}</span>
                </div>
                <h1 className="restaurant-detail-title">{restaurant.name}</h1>
                <div className="restaurant-detail-meta">
                  <span className="restaurant-detail-location">
                    <MapPin size={15} />
                    {restaurant.city}
                    {restaurant.state ? `, ${restaurant.state}` : ""}
                  </span>
                  {restaurant.address && (
                    <span>
                      {restaurant.pin_code
                        ? `PIN ${restaurant.pin_code}`
                        : restaurant.address}
                    </span>
                  )}
                </div>
                <div className="restaurant-contact-row">
                  {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`}>
                      <Phone size={15} />
                      {restaurant.phone}
                    </a>
                  )}
                  {restaurant.email && (
                    <a href={`mailto:${restaurant.email}`}>
                      <Mail size={15} />
                      {restaurant.email}
                    </a>
                  )}
                  {restaurant.hours?.length > 0 && (
                    <span>
                      <Clock3 size={15} />
                      {restaurant.hours.some((item) => item.enabled)
                        ? "Hours available below"
                        : "Hours not set"}
                    </span>
                  )}
                </div>

                <nav
                  className="restaurant-detail-tabs"
                  aria-label="Restaurant details sections"
                >
                  {detailTabs.map((tab) => (
                    <Link
                      key={tab.id}
                      className={activeSection === tab.id ? "active" : ""}
                      to={`/customer/restaurants/${restaurant.id}/${tab.id}`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>

                {activeSection === "about" && (
                  <section className="restaurant-detail-section">
                    <h2>About {restaurant.name}</h2>
                    <p>
                      {restaurant.description ||
                        "More information about this restaurant will be available soon."}
                    </p>
                    <div className="restaurant-capacity-facts">
                      {restaurant.capacity != null && (
                        <span>
                          <Users size={16} /> Seating capacity:{" "}
                          {restaurant.capacity}
                        </span>
                      )}
                      {restaurant.tables != null && (
                        <span>
                          <Users size={16} /> Dining tables: {restaurant.tables}
                        </span>
                      )}
                    </div>
                    {floors.length > 0 && <div className="restaurant-detail-hours-block"><h2>Floor & table availability</h2>{floors.map(floor => <div className="restaurant-hour-row" key={floor.id}><span>{floor.name}</span><span>{floor.tables.filter(table => table.status === "available").length} available / {floor.tables.length} tables</span></div>)}</div>}
                    <div className="restaurant-detail-hours-block">
                      <h2>
                        <Clock3 size={18} /> Operating hours
                      </h2>
                      {restaurant.hours?.length ? (
                        restaurant.hours.map((hour) => (
                          <div className="restaurant-hour-row" key={hour.day}>
                            <span>{hour.day}</span>
                            <span>
                              {hour.enabled
                                ? `${hour.opens || "—"} – ${hour.closes || "—"}`
                                : "Closed"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p>Operating hours have not been added yet.</p>
                      )}
                    </div>
                  </section>
                )}

                {activeSection === "amenities" && (
                  <section className="restaurant-detail-section">
                    <h2>Amenities</h2>
                    <p>Amenities have not been added by this restaurant yet.</p>
                  </section>
                )}
                {activeSection === "menu-preview" && (
                  <section className="restaurant-detail-section customer-live-menu">
                    <div className="customer-menu-heading">
                      <div>
                        <span className="customer-menu-eyebrow">
                          FROM {restaurant.name.toUpperCase()}
                        </span>
                        <h2>Explore the menu</h2>
                        <p>
                          Browse dishes and choose from this restaurant’s
                          available options.
                        </p>
                      </div>
                    </div>
                    {menuLoading ? (
                      <p className="customer-menu-message" role="status">
                        Loading menu…
                      </p>
                    ) : menuError ? (
                      <p className="customer-menu-message" role="alert">
                        {menuError}
                      </p>
                    ) : menuCategories.length === 0 ? (
                      <div className="customer-menu-empty">
                        <h3>The menu is being prepared</h3>
                        <p>
                          {restaurant.name} hasn’t added any menu categories
                          yet. Please check back soon.
                        </p>
                      </div>
                    ) : (
                      <>
                        <nav
                          className="customer-menu-categories"
                          aria-label="Menu categories"
                        >
                          {menuCategories.map((category) => (
                            <button
                              type="button"
                              key={category.id}
                              className={
                                (selectedMenuCategoryId ||
                                  menuCategories[0]?.id) === category.id
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                setSelectedMenuCategoryId(category.id)
                              }
                            >
                              {category.name}
                              <span>{category.foods.length}</span>
                            </button>
                          ))}
                        </nav>
                        {menuCategories
                          .filter(
                            (category) =>
                              category.id ===
                              (selectedMenuCategoryId || menuCategories[0]?.id),
                          )
                          .map((category) => (
                            <div
                              key={category.id}
                              className="customer-menu-category-content"
                            >
                              <div className="customer-menu-category-title">
                                <h3>{category.name}</h3>
                                {category.description && (
                                  <p>{category.description}</p>
                                )}
                              </div>
                              {category.foods.length === 0 ? (
                                <p className="customer-menu-message">
                                  No dishes are listed in this category yet.
                                </p>
                              ) : (
                                <div className="customer-menu-grid">
                                  {category.foods.map((food) => (
                                    <article
                                      className={`customer-menu-card ${food.is_available ? "" : "unavailable"}`}
                                      key={food.id}
                                    >
                                      {food.images?.[0] && (
                                        <img
                                          className="customer-menu-image"
                                          src={food.images[0].url}
                                          alt={food.name}
                                          loading="lazy"
                                        />
                                      )}
                                      <div className="customer-menu-card-content">
                                        <div className="customer-menu-card-title">
                                          <h4>{food.name}</h4>
                                        </div>
                                        {food.description && (
                                          <p className="customer-menu-description">
                                            {food.description}
                                          </p>
                                        )}
                                        {food.variants?.length > 0 && (
                                          <ul className="customer-menu-variants">
                                            {food.variants.filter((variant) => variant.is_available).map((variant) => (
                                              <li key={variant.id}><span>{variant.name}</span><strong>₹{Number(variant.price).toFixed(2)}</strong></li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </>
                    )}
                  </section>
                )}
                {activeSection === "reviews" && (
                  <section className="restaurant-detail-section">
                    <h2>
                      <Star size={18} /> Customer Reviews
                    </h2>
                    <p>Customer reviews are not available yet.</p>
                  </section>
                )}
                {activeSection === "reservations" && (
                  <section className="restaurant-detail-section">
                    <h2>Reserve a table at {restaurant.name}</h2>
                    <p>Choose your date, party size, and preferred time in the booking panel. We’ll check this restaurant’s operating hours and table availability before you select a table.</p>
                    <div className="restaurant-capacity-facts">
                      <span><CalendarDays size={16} /> Select an available date and time</span>
                      <span><Users size={16} /> Choose a table that fits your party</span>
                    </div>
                    <section className="customer-my-reservations customer-reservation-history">
                      <div className="reservation-history-heading">
                        <div><h3>Your reservations</h3><p>Manage your upcoming and past visits.</p></div>
                        <span>{restaurantReservations.length} total</span>
                      </div>
                      <div className="reservation-history-toolbar">
                        <label>Status<select value={reservationStatusFilter} onChange={(event) => setReservationStatusFilter(event.target.value)}>
                          <option value="ALL">All statuses</option><option value="PENDING_PAYMENT">Payment due</option><option value="CONFIRMED">Confirmed</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option>
                        </select></label>
                        <label>Date<input type="date" value={reservationDateFilter} onChange={(event) => setReservationDateFilter(event.target.value)} /></label>
                        <label>Sort by<select value={reservationSort} onChange={(event) => setReservationSort(event.target.value)}>
                          <option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="FEE_LOW">Fee: low to high</option><option value="FEE_HIGH">Fee: high to low</option>
                        </select></label>
                      </div>
                      {restaurantReservations.length === 0 ? <p className="reservation-history-empty">You haven’t made any reservations at this restaurant yet.</p> : sortedReservations.length === 0 ? <p className="reservation-history-empty">No reservations match these filters. Adjust the status or date to see more.</p> : <>
                        <div className="reservation-history-cards">
                          {pagedReservations.map((item) => {
                            const label = { PENDING_PAYMENT: "Payment due", CONFIRMED: "Confirmed", CANCELLED: "Cancelled", COMPLETED: "Completed" }[item.status] ?? item.status.replaceAll("_", " ");
                            const tableNames = item.tables?.map((table) => table.table_number).filter(Boolean).join(", ");
                            return <article className="reservation-history-card" key={item.id} role="button" tabIndex={0} onClick={() => setSelectedReservation(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedReservation(item); } }} aria-label={`View reservation details for ${item.reservation_date}`}>
                              <div className="reservation-card-top"><div><span className="reservation-card-eyebrow">Reservation</span><h4>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${item.reservation_date}T12:00:00`))}</h4></div><span className={`reservation-status-pill status-${item.status.toLowerCase().replaceAll("_", "-")}`}>{label}</span></div>
                              <div className="reservation-card-details"><span><Clock3 size={15} />{item.start_time}</span><span><Users size={15} />{item.number_of_guests} guests</span><span><CalendarDays size={15} />{tableNames ? `Table ${tableNames}` : "Table assignment pending"}</span></div>
                              <div className="reservation-card-bottom"><div><small>Table reservation fee</small><strong>₹{Number(item.fee_amount ?? 0).toFixed(2)}</strong></div><span className="reservation-card-view">View details</span></div>
                            </article>;
                          })}
                        </div>
                        <div className="reservation-pagination"><span>Showing {(currentReservationPage - 1) * reservationsPerPage + 1}–{Math.min(currentReservationPage * reservationsPerPage, sortedReservations.length)} of {sortedReservations.length}</span><div><button type="button" aria-label="Previous page" disabled={currentReservationPage <= 1} onClick={() => setReservationPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button><strong>{currentReservationPage} / {reservationPageCount}</strong><button type="button" aria-label="Next page" disabled={currentReservationPage >= reservationPageCount} onClick={() => setReservationPage((page) => Math.min(reservationPageCount, page + 1))}><ChevronRight size={16} /></button></div></div>
                      </>}
                    </section>
                    {selectedReservation && <div className="reservation-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReservation(null); }}>
                      <section className="reservation-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title">
                        <button type="button" className="reservation-detail-close" aria-label="Close reservation details" onClick={() => setSelectedReservation(null)}><X size={18} /></button>
                        <span className="reservation-card-eyebrow">RESERVATION DETAILS</span>
                        <div className="reservation-detail-title-row"><h3 id="reservation-detail-title">{restaurant.name}</h3><span className={`reservation-status-pill status-${selectedReservation.status.toLowerCase().replaceAll("_", "-")}`}>{({ PENDING_PAYMENT: "Payment due", CONFIRMED: "Confirmed", CANCELLED: "Cancelled", COMPLETED: "Completed" })[selectedReservation.status] ?? selectedReservation.status.replaceAll("_", " ")}</span></div>
                        <p className="reservation-detail-reference">Booking reference · {selectedReservation.id.slice(0, 8).toUpperCase()}</p>
                        <div className="reservation-detail-grid">
                          <div><small>Date</small><strong>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${selectedReservation.reservation_date}T12:00:00`))}</strong></div>
                          <div><small>Time</small><strong>{selectedReservation.start_time}{selectedReservation.end_time ? ` – ${selectedReservation.end_time}` : ""}</strong></div>
                          <div><small>Party size</small><strong>{selectedReservation.number_of_guests} {selectedReservation.number_of_guests === 1 ? "guest" : "guests"}</strong></div>
                          <div><small>Table</small><strong>{selectedReservation.tables?.length ? selectedReservation.tables.map((table) => `${table.floor_name} · Table ${table.table_number} (${table.capacity} seats)`).join(", ") : "Assignment pending"}</strong></div>
                          <div><small>Reservation fee</small><strong>₹{Number(selectedReservation.fee_amount ?? 0).toFixed(2)}</strong></div>
                          <div><small>Payment</small><strong>{selectedReservation.payment_status === "PAID" ? "Paid" : "Pending"}</strong></div>
                        </div>
                        {selectedReservation.special_request && <div className="reservation-detail-request"><small>Special request</small><p>{selectedReservation.special_request}</p></div>}
                        <p className="reservation-detail-note">Food and drinks are billed separately at the restaurant.</p>
                        <div className="reservation-detail-actions"><button type="button" className="reservation-detail-done" onClick={() => setSelectedReservation(null)}>Close</button>{["PENDING_PAYMENT", "CONFIRMED"].includes(selectedReservation.status) && <button type="button" className="reservation-detail-cancel" onClick={async () => { await cancelMyReservation(selectedReservation); setSelectedReservation((current) => current ? { ...current, status: "CANCELLED" } : current); }}>Cancel reservation</button>}</div>
                      </section>
                    </div>}
                  </section>
                )}
              </div>

              {activeSection === "reservations" && <aside className="restaurant-booking-card">
                <p className="booking-eyebrow">SECURE A TABLE</p>
                <div className="reservation-flow-progress"><span className={bookingStep >= 1 ? "active" : ""}>1 Details</span><i /><span className={bookingStep >= 2 ? "active" : ""}>2 Table</span><i /><span className={bookingStep >= 3 ? "active" : ""}>3 Review</span></div>
                {bookingStep === 1 && <>
                <h2>Booking Reservation</h2>
                <form onSubmit={submitReservation}>
                  <label htmlFor="booking-date">Select date</label>
                  <div className="booking-input-wrap">
                    <input
                      id="booking-date"
                      type="date"
                      min={localDateValue()}
                      value={date}
                      onChange={(event) => { setDate(event.target.value); setBookingMessage(""); }}
                      required
                    />
                    <CalendarDays size={16} />
                  </div>
                  <label htmlFor="booking-guests">Guests</label>
                  <div className="booking-input-wrap">
                    <select
                      id="booking-guests"
                      value={guests}
                      onChange={(event) => { setGuests(event.target.value); setBookingMessage(""); }}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (count) => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? "Guest" : "Guests"}
                          </option>
                        ),
                      )}
                    </select>
                    <Users size={16} />
                  </div>
                  <label>Preferred time</label>
                  <div className="booking-time-options">
                    {timeOptions.map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={time === option ? "selected" : ""}
                        onClick={() => { setTime(option); setBookingMessage(""); }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button className="booking-submit" type="submit" disabled={bookingBusy}>
                    {bookingBusy ? "Checking tables…" : "Check availability"}
                  </button>
                  {bookingMessage && (
                    <p className="booking-message" role="status">
                      {bookingMessage}
                    </p>
                  )}
                  <p className="booking-note">Choose a date, party size, and time to see tables that are available for your visit.</p>
                </form>
                </>}
                {bookingStep === 2 && <section className="customer-table-step">
                  <h2>Select your table</h2><p className="booking-note">{date} · {time} · {guests} {Number(guests) === 1 ? "guest" : "guests"}</p>
                  {availableTables.length ? <div className="customer-available-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={`customer-available-table${selectedTableId === table.id ? " selected" : ""}`} onClick={() => setSelectedTableId(table.id)}><span className="customer-table-check">{selectedTableId === table.id ? "✓" : ""}</span><span className="customer-table-copy"><strong>Table {table.table_number}</strong><small>{table.floor_name} · Seats up to {table.capacity}</small></span><strong className="customer-table-price">₹{Number(table.reservation_fee).toFixed(2)}</strong></button>)}</div> : <div className="customer-no-tables">No suitable tables are available for this date and time.</div>}
                  {bookingMessage && <p className="booking-message" role="status">{bookingMessage}</p>}
                  <div className="customer-reservation-actions"><button type="button" className="customer-booking-back" onClick={() => { setBookingStep(1); setBookingMessage(""); }}>Back</button><button type="button" className="booking-submit" disabled={!selectedTableId} onClick={() => setBookingStep(3)}>Continue to review</button></div>
                </section>}
                {bookingStep === 3 && (() => {
                  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
                  return <section className="customer-review-step"><h2>Review reservation</h2><div className="customer-reservation-summary"><div><span>Restaurant</span><strong>{restaurant.name}</strong></div><div><span>Date</span><strong>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`))}</strong></div><div><span>Guests</span><strong>{guests}</strong></div><div><span>Preferred time</span><strong>{time}</strong></div><div><span>Selected table</span><strong>{selectedTable?.floor_name} · Table {selectedTable?.table_number}</strong></div><div className="customer-reservation-total"><span>Table booking fee</span><strong>₹{Number(selectedTable?.reservation_fee || 0).toFixed(2)}</strong></div></div><div className="customer-fee-notice"><strong>Payment required to confirm</strong><p>The restaurant will verify your payment. Your reservation remains pending until payment is recorded by the restaurant.</p></div>{bookingMessage && <p className="booking-message" role="alert">{bookingMessage}</p>}<div className="customer-reservation-actions"><button type="button" className="customer-booking-back" onClick={() => setBookingStep(2)}>Back</button><button type="button" className="booking-submit" disabled={bookingBusy} onClick={confirmReservation}>{bookingBusy ? "Submitting…" : "Submit reservation"}</button></div></section>;
                })()}
                {bookingStep === 4 && reservationResult && <section className="customer-reservation-confirmation"><div className="customer-reservation-confirm-icon">✓</div><span className="booking-eyebrow">RESERVATION REQUEST RECEIVED</span><h2>Payment pending</h2><p>Your table request is saved. The restaurant will confirm the reservation after receiving the ₹{Number(reservationResult.fee_amount).toFixed(2)} table fee.</p><div className="customer-reservation-summary"><div><span>Reservation ID</span><strong>{reservationResult.id.slice(0, 8).toUpperCase()}</strong></div><div><span>Date & time</span><strong>{reservationResult.reservation_date} · {time}</strong></div><div><span>Table</span><strong>{reservationResult.tables?.[0]?.floor_name} · Table {reservationResult.tables?.[0]?.table_number}</strong></div><div><span>Party size</span><strong>{reservationResult.number_of_guests} guests</strong></div><div className="customer-reservation-total"><span>Status</span><strong>Awaiting payment</strong></div></div><button type="button" className="customer-booking-back customer-new-booking" onClick={resetReservationFlow}>Start another reservation</button></section>}
              </aside>}
            </div>
          </>
        ) : null}
        <Link
          className="restaurant-details-back"
          to="/customer#restaurants-near-you"
        >
          <ArrowLeft size={15} /> Back to restaurants
        </Link>
      </main>
      <LandingFooter />
    </div>
  );
}
