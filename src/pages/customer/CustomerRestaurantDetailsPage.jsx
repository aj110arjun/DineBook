import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
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
import { photo } from "../../data/landingData.js";

const timeOptions = ["7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];
const detailTabs = [
  { id: "about", label: "About" },
  { id: "amenities", label: "Amenities" },
  { id: "menu-preview", label: "Menu" },
  { id: "reviews", label: "Reviews" },
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
      .then(setMyReservations)
      .catch(() => setMyReservations([]));
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
      setReservationResult(reservation);
      setMyReservations((current) => [reservation, ...current]);
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
      setMyReservations((current) => current.map((reservation) => reservation.id === item.id ? { ...reservation, status: "CANCELLED" } : reservation));
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

            <div className="restaurant-details-layout">
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
              </div>

              <aside className="restaurant-booking-card">
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
                {myReservations.length > 0 && <section className="customer-my-reservations"><h3>Your reservations</h3>{myReservations.slice(0, 4).map((item) => <article key={item.id}><strong>{item.reservation_date} · {item.start_time}</strong><span>{item.number_of_guests} guests · ₹{Number(item.fee_amount).toFixed(2)} · {item.status.replaceAll("_", " ")}</span>{["PENDING_PAYMENT", "CONFIRMED"].includes(item.status) && <button type="button" onClick={() => cancelMyReservation(item)}>Cancel</button>}</article>)}</section>}
              </aside>
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
