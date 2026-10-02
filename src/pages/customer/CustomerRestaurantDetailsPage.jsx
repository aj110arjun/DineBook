import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, Leaf, Mail, MapPin, Phone, Star, Timer, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
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
  const [restaurant, setRestaurant] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(localDateValue);
  const [guests, setGuests] = useState("2");
  const [time, setTime] = useState("8:00 PM");
  const [bookingMessage, setBookingMessage] = useState("");
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = useState("");
  const activeSection = detailTabs.some((tab) => tab.id === section) ? section : "about";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    requestJson(`/api/customer/restaurants/${restaurantId}`)
      .then((data) => mounted && setRestaurant(data))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
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
        setSelectedMenuCategoryId((current) => data.some((category) => category.id === current) ? current : data[0]?.id ?? "");
      })
      .catch((reason) => mounted && setMenuError(reason.message))
      .finally(() => mounted && setMenuLoading(false));
    return () => { mounted = false; };
  }, [restaurantId, activeSection]);

  useEffect(() => {
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active") {
      setUser(demoCustomer);
      return;
    }
    let mounted = true;
    requestJson("/api/customer/me")
      .then((data) => mounted && setUser(data))
      .catch(() => mounted && setUser(null));
    return () => { mounted = false; };
  }, []);

  const gallery = restaurant?.images?.length
    ? restaurant.images
    : restaurant?.image
      ? [restaurant.image]
      : [photo("photo-1517248135467-4c7edcad34c4", 1400)];

  function submitReservation(event) {
    event.preventDefault();
    setBookingMessage(
      restaurant.phone
        ? `Online reservations are coming soon. Call ${restaurant.phone} to request this table.`
        : "Online reservations are coming soon for this restaurant.",
    );
  }

  return (
    <div className="customer-home">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <main className="restaurant-details-page">
        <nav className="restaurant-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/customer">Home</Link><span>/</span>
          <Link to="/customer#restaurants-near-you">Restaurants</Link><span>/</span>
          {restaurant ? <><span>{[restaurant.city, restaurant.state].filter(Boolean).join(", ")}</span><span>/</span><strong>{restaurant.name}</strong></> : <span>Restaurant details</span>}
        </nav>

        {loading ? (
          <p className="restaurant-detail-message" role="status">Loading restaurant details…</p>
        ) : error ? (
          <div className="restaurant-detail-message" role="alert">
            <p>{error}</p><Link to="/customer#restaurants-near-you">Return to restaurants</Link>
          </div>
        ) : restaurant ? (
          <>
            <div className={`restaurant-gallery${gallery.length === 1 ? " single" : gallery.length === 2 ? " two" : ""}`}>
              {gallery.slice(0, 3).map((image, index) => (
                <div key={`${image}-${index}`} className={`restaurant-gallery-image gallery-image-${index + 1}`} style={{ backgroundImage: `url(${image})` }} role="img" aria-label={`${restaurant.name} ${index === 0 ? "interior" : "gallery"}`} />
              ))}
            </div>

            <div className="restaurant-details-layout">
              <div className="restaurant-details-main">
                <div className="restaurant-detail-tags"><span>{restaurant.cuisine}</span></div>
                <h1 className="restaurant-detail-title">{restaurant.name}</h1>
                <div className="restaurant-detail-meta">
                  <span className="restaurant-detail-location"><MapPin size={15} />{restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ""}</span>
                  {restaurant.address && <span>{restaurant.pin_code ? `PIN ${restaurant.pin_code}` : restaurant.address}</span>}
                </div>
                <div className="restaurant-contact-row">
                  {restaurant.phone && <a href={`tel:${restaurant.phone}`}><Phone size={15} />{restaurant.phone}</a>}
                  {restaurant.email && <a href={`mailto:${restaurant.email}`}><Mail size={15} />{restaurant.email}</a>}
                  {restaurant.hours?.length > 0 && <span><Clock3 size={15} />{restaurant.hours.some((item) => item.enabled) ? "Hours available below" : "Hours not set"}</span>}
                </div>

                <nav className="restaurant-detail-tabs" aria-label="Restaurant details sections">
                  {detailTabs.map((tab) => <Link key={tab.id} className={activeSection === tab.id ? "active" : ""} to={`/customer/restaurants/${restaurant.id}/${tab.id}`}>{tab.label}</Link>)}
                </nav>

                {activeSection === "about" && <section className="restaurant-detail-section">
                  <h2>About {restaurant.name}</h2>
                  <p>{restaurant.description || "More information about this restaurant will be available soon."}</p>
                  <div className="restaurant-capacity-facts">
                    {restaurant.capacity != null && <span><Users size={16} /> Seating capacity: {restaurant.capacity}</span>}
                    {restaurant.tables != null && <span><Users size={16} /> Dining tables: {restaurant.tables}</span>}
                  </div>
                  <div className="restaurant-detail-hours-block">
                    <h2><Clock3 size={18} /> Operating hours</h2>
                    {restaurant.hours?.length ? restaurant.hours.map((hour) => <div className="restaurant-hour-row" key={hour.day}><span>{hour.day}</span><span>{hour.enabled ? `${hour.opens || "—"} – ${hour.closes || "—"}` : "Closed"}</span></div>) : <p>Operating hours have not been added yet.</p>}
                  </div>
                </section>}

                {activeSection === "amenities" && <section className="restaurant-detail-section"><h2>Amenities</h2><p>Amenities have not been added by this restaurant yet.</p></section>}
                {activeSection === "menu-preview" && <section className="restaurant-detail-section customer-live-menu">
                  <div className="customer-menu-heading"><div><span className="customer-menu-eyebrow">FROM {restaurant.name.toUpperCase()}</span><h2>Explore the menu</h2><p>Browse dishes and choose from this restaurant’s available options.</p></div></div>
                  {menuLoading ? <p className="customer-menu-message" role="status">Loading menu…</p> : menuError ? <p className="customer-menu-message" role="alert">{menuError}</p> : menuCategories.length === 0 ? <div className="customer-menu-empty"><h3>The menu is being prepared</h3><p>{restaurant.name} hasn’t added any menu categories yet. Please check back soon.</p></div> : <>
                    <nav className="customer-menu-categories" aria-label="Menu categories">{menuCategories.map((category) => <button type="button" key={category.id} className={(selectedMenuCategoryId || menuCategories[0]?.id) === category.id ? "active" : ""} onClick={() => setSelectedMenuCategoryId(category.id)}>{category.name}<span>{category.foods.length}</span></button>)}</nav>
                    {menuCategories.filter((category) => category.id === (selectedMenuCategoryId || menuCategories[0]?.id)).map((category) => <div key={category.id} className="customer-menu-category-content"><div className="customer-menu-category-title"><h3>{category.name}</h3>{category.description && <p>{category.description}</p>}</div>{category.foods.length === 0 ? <p className="customer-menu-message">No dishes are listed in this category yet.</p> : <div className="customer-menu-grid">{category.foods.map((food) => <article className={`customer-menu-card ${food.is_available ? "" : "unavailable"}`} key={food.id}>
                      {food.images[0] ? <img className="customer-menu-card-image" src={food.images[0].image_url} alt={food.name} loading="lazy" /> : <div className="customer-menu-card-image customer-menu-image-placeholder" aria-hidden="true" />}
                      <div className="customer-menu-card-content"><div className="customer-menu-card-title"><h4>{food.name}</h4>{food.is_vegetarian && <span className="customer-veg-mark" title="Vegetarian"><Leaf size={13} /></span>}</div>
                        {food.description && <p className="customer-menu-description">{food.description}</p>}
                        {food.preparation_time_minutes && <p className="customer-menu-prep"><Timer size={13} />About {food.preparation_time_minutes} min</p>}
                        <div className="customer-menu-variants">{food.variants.map((variant) => <div key={variant.id}><span>{variant.name}</span><strong>₹{variant.price}</strong>{(!food.is_available || !variant.is_available) && <em>Unavailable</em>}</div>)}</div>
                      </div>
                    </article>)}</div>}</div>)}
                  </>}
                </section>}
                {activeSection === "reviews" && <section className="restaurant-detail-section"><h2><Star size={18} /> Customer Reviews</h2><p>Customer reviews are not available yet.</p></section>}
              </div>

              <aside className="restaurant-booking-card">
                <p className="booking-eyebrow">SECURE A TABLE</p>
                <h2>Booking Reservation</h2>
                <form onSubmit={submitReservation}>
                  <label htmlFor="booking-date">Select date</label>
                  <div className="booking-input-wrap"><input id="booking-date" type="date" min={localDateValue()} value={date} onChange={(event) => setDate(event.target.value)} required /><CalendarDays size={16} /></div>
                  <label htmlFor="booking-guests">Guests</label>
                  <div className="booking-input-wrap"><select id="booking-guests" value={guests} onChange={(event) => setGuests(event.target.value)}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "Guest" : "Guests"}</option>)}</select><Users size={16} /></div>
                  <label>Preferred time</label>
                  <div className="booking-time-options">{timeOptions.map((option) => <button type="button" key={option} className={time === option ? "selected" : ""} onClick={() => setTime(option)}>{option}</button>)}</div>
                  <button className="booking-submit" type="submit">Check Availability</button>
                  {bookingMessage && <p className="booking-message" role="status">{bookingMessage}</p>}
                  <p className="booking-note">No booking fee. Availability is confirmed directly by the restaurant.</p>
                </form>
              </aside>
            </div>
          </>
        ) : null}
        <Link className="restaurant-details-back" to="/customer#restaurants-near-you"><ArrowLeft size={15} /> Back to restaurants</Link>
      </main>
      <LandingFooter />
    </div>
  );
}
