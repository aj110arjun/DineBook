import { useEffect, useState } from "react";
import {
  Armchair,
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
  Utensils,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import CustomTimePicker from "../../components/CustomTimePicker.jsx";
import CustomDatePicker from "../../components/CustomDatePicker.jsx";
import CustomGuestPicker from "../../components/CustomGuestPicker.jsx";
import Pagination from "../../components/Pagination.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { mergeReservations, saveReservation } from "../../data/customerReservations.js";
import { photo } from "../../data/landingData.js";
import "./CustomerRestaurantReviews.css";

const detailTabs = [
  { id: "about", label: "About" },
  { id: "amenities", label: "Amenities" },
  { id: "menu-preview", label: "Menu" },
  { id: "reviews", label: "Reviews" },
  { id: "reservations", label: "Reservations" },
];
const reservationCode = (reservation) => reservation?.reservation_code || `RES-${String(reservation?.id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`;

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
  const [time, setTime] = useState("20:00");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [selectedOrderReservationId, setSelectedOrderReservationId] = useState("");
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [restaurantReviews, setRestaurantReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewForm, setReviewForm] = useState({ order_id: "", rating: 5, content: "" });
  const [hoverRating, setHoverRating] = useState(0);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [flaggingReviewId, setFlaggingReviewId] = useState(null);
  const [flagReason, setFlagReason] = useState("SPAM");
  const [flagExplanation, setFlagExplanation] = useState("");
  const [reservationStatusFilter, setReservationStatusFilter] = useState("ALL");
  const [reservationDateFilter, setReservationDateFilter] = useState("");
  const [reservationSort, setReservationSort] = useState("NEWEST");
  const [reservationPage, setReservationPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [pendingReservationCancellation, setPendingReservationCancellation] = useState(null);
  const [cancellingReservation, setCancellingReservation] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [reservationResult, setReservationResult] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [restaurantOffers, setRestaurantOffers] = useState([]);
  const [floors, setFloors] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [selectedMenuCategoryId, setSelectedMenuCategoryId] = useState("");
  const [menuQuery, setMenuQuery] = useState("");
  const [menuSort, setMenuSort] = useState("name");
  const [menuPage, setMenuPage] = useState(1);
  const activeSection = detailTabs.some((tab) => tab.id === section)
    ? section
    : "about";
  const restaurantReservations = myReservations.filter((item) => String(item.restaurant_id) === String(restaurantId));
  const sortedReservations = restaurantReservations
    .filter((item) => reservationStatusFilter === "ALL" || item.status === reservationStatusFilter)
    .filter((item) => !reservationDateFilter || item.reservation_date === reservationDateFilter)
    .sort((a, b) => {
      const aDate = Date.parse(a.created_at || `${a.reservation_date}T${a.start_time}`) || 0;
      const bDate = Date.parse(b.created_at || `${b.reservation_date}T${b.start_time}`) || 0;
      if (reservationSort === "OLDEST") return aDate - bDate;
      if (reservationSort === "FEE_LOW") return Number(a.fee_amount) - Number(b.fee_amount);
      if (reservationSort === "FEE_HIGH") return Number(b.fee_amount) - Number(a.fee_amount);
      return bDate - aDate;
    });
  const reservationsPerPage = 4;
  const reservationPageCount = Math.max(1, Math.ceil(sortedReservations.length / reservationsPerPage));
  const currentReservationPage = Math.min(reservationPage, reservationPageCount);
  const pagedReservations = sortedReservations.slice((currentReservationPage - 1) * reservationsPerPage, currentReservationPage * reservationsPerPage);
  const activeMenuCategory = menuCategories.find((category) => category.id === (selectedMenuCategoryId || menuCategories[0]?.id));
  const menuNeedle = menuQuery.trim().toLowerCase();
  const filteredMenuFoods = (activeMenuCategory?.foods || []).filter((food) => food.is_available && (!menuNeedle || `${food.name} ${food.description || ""} ${activeMenuCategory?.name || ""}`.toLowerCase().includes(menuNeedle))).sort((left, right) => {
    if (menuSort === "price-low" || menuSort === "price-high") {
      const lowest = (food) => Math.min(...(food.variants || []).filter((variant) => variant.is_available).map((variant) => Number(variant.price)), Number.POSITIVE_INFINITY);
      const delta = lowest(left) - lowest(right);
      return menuSort === "price-low" ? delta : -delta;
    }
    return menuSort === "name-desc" ? right.name.localeCompare(left.name) : left.name.localeCompare(right.name);
  });
  const menuPageSize = 8;
  const visibleMenuFoods = filteredMenuFoods.slice((menuPage - 1) * menuPageSize, menuPage * menuPageSize);
  useEffect(() => { setMenuPage(1); }, [menuQuery, menuSort, selectedMenuCategoryId]);

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
    let mounted = true;
    requestJson(`/api/customer/orders/offers?restaurant_id=${encodeURIComponent(restaurantId)}`)
      .then((data) => mounted && setRestaurantOffers(data))
      .catch(() => mounted && setRestaurantOffers([]));
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
      .then((items) => {
        const merged = mergeReservations(items, user.email);
        setMyReservations(merged);
        setSelectedOrderReservationId((current) => merged.some((item) => item.id === current && item.status === "SEATED" && String(item.restaurant_id) === String(restaurantId))
          ? current
          : merged.find((item) => item.status === "SEATED" && String(item.restaurant_id) === String(restaurantId))?.id || "");
      })
      .catch(() => setMyReservations(mergeReservations([], user.email)));
  }, [user, restaurantId]);

  useEffect(() => {
    if (activeSection !== "reviews") return undefined;
    let mounted = true;
    setReviewLoading(true);
    setReviewError("");
    requestJson(`/api/reviews/restaurants/${restaurantId}?limit=50&offset=0`)
      .then((data) => mounted && setRestaurantReviews(data.items || []))
      .catch((reason) => mounted && setReviewError(reason.message))
      .finally(() => mounted && setReviewLoading(false));
    return () => { mounted = false; };
  }, [activeSection, restaurantId]);

  useEffect(() => {
    if (activeSection !== "reviews" || !user) return undefined;
    let mounted = true;
    Promise.all([requestJson("/api/customer/orders"), requestJson("/api/customer/reviews")])
      .then(([orders, mine]) => {
        if (!mounted) return;
        setRestaurantReviews((current) => {
          const ownReviews = (mine || []).filter((review) => String(review.restaurant_id) === String(restaurantId));
          const ownIds = new Set(ownReviews.map((review) => review.id));
          return [...ownReviews, ...current.filter((review) => !ownIds.has(review.id))];
        });
        setEligibleOrders((current) => {
          const completed = (orders || []).filter((order) => order.status === "COMPLETED" && String(order.restaurant_id) === String(restaurantId));
          const hasRestaurantReview = (mine || []).some((review) => String(review.restaurant_id) === String(restaurantId));
          return hasRestaurantReview ? [] : completed;
        });
      })
      .catch((reason) => { if (mounted) setReviewError(reason.message); });
    return () => { mounted = false; };
  }, [activeSection, user, restaurantId]);

  async function submitRestaurantReview(event) {
    event.preventDefault();
    setReviewBusy(true); setReviewError(""); setReviewMessage("");
    try {
      const saved = await requestJson(editingReviewId ? `/api/customer/reviews/${editingReviewId}` : "/api/customer/reviews", {
        method: editingReviewId ? "PATCH" : "POST",
        body: JSON.stringify({ ...reviewForm, food_id: null }),
      });
      setRestaurantReviews((current) => [saved, ...current.filter((review) => review.id !== saved.id)]);
      setEligibleOrders((current) => current.filter((order) => order.id !== saved.order_id));
      setReviewForm({ order_id: "", rating: 5, content: "" }); setEditingReviewId(null);
      setReviewMessage(editingReviewId ? "Your review was updated." : "Thanks, your review was submitted.");
    } catch (reason) { setReviewError(reason.message); }
    finally { setReviewBusy(false); }
  }

  async function flagRestaurantReview(reviewId) {
    try {
      await requestJson(`/api/customer/reviews/${reviewId}/flags`, { method: "POST", body: JSON.stringify({ reason: flagReason, explanation: flagExplanation || null }) });
      setFlaggingReviewId(null); setFlagExplanation(""); setReviewMessage("Your report was submitted to the moderation team.");
    } catch (reason) { setReviewError(reason.message); }
  }

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

  function reservationStartTime() { return time; }
  function displayTime(value) {
    const [hour, minute] = value.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  }

  async function confirmReservation() {
    setBookingBusy(true);
    setBookingMessage("");
    try {
      const reservation = await requestJson("/api/customer/reservations", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: restaurant.id, reservation_date: date,
          start_time: reservationStartTime(), number_of_guests: Number(guests), table_ids: availableTables.find((table) => table.id === selectedTableId)?.table_ids || [selectedTableId] }),
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
    setCancellingReservation(true);
    try {
      await requestJson(`/api/customer/reservations/${item.id}/cancel`, { method: "POST" });
      const updated = { ...item, status: "CANCELLED" };
      saveReservation(user?.email, updated);
      setMyReservations((current) => current.map((reservation) => reservation.id === item.id ? updated : reservation));
      setSelectedReservation(updated);
      return true;
    } catch (reason) {
      setBookingMessage(reason.message);
      return false;
    } finally {
      setCancellingReservation(false);
    }
  }

  const hasPublishedOwnReview = restaurantReviews.some((review) => review.is_mine && review.status === "PUBLISHED");

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
                  <Link
                    className="restaurant-detail-availability-link"
                    to={`/customer/restaurants/${restaurant.id}/reservations`}
                  >
                    <CalendarDays size={14} /> Check availability
                  </Link>
                </nav>

                {activeSection === "about" && (
                  <section className="restaurant-detail-section restaurant-about-section">
                    <header className="restaurant-about-intro">
                      <span className="restaurant-about-eyebrow">RESTAURANT GUIDE</span>
                      <h2>About {restaurant.name}</h2>
                      <p>{restaurant.description || "More information about this restaurant will be available soon."}</p>
                    </header>
                    {restaurantOffers.length > 0 && <section className="customer-offers-panel" aria-label="Available offers"><div><span>DINING OFFERS</span><h2>Restaurant offers</h2></div><div className="customer-offers-list">{restaurantOffers.map((offer) => <article key={offer.id}><b>{offer.title}</b><span>{offer.discount_type === "PERCENTAGE" ? `${offer.discount_percent}% off` : `₹${Number(offer.discount_percent).toFixed(2)} off`} <i className={`offer-status ${offer.status.toLowerCase()}`}>{offer.status}</i></span><small>{offer.description || `Use code ${offer.code}`} · Minimum ₹{Number(offer.minimum_subtotal).toFixed(2)}{offer.max_discount ? ` · Maximum discount ₹${Number(offer.max_discount).toFixed(2)}` : ""}</small><small>Code: <strong>{offer.code}</strong> · {offer.applicability === "RESTAURANT" ? "Entire order" : `${offer.applicability === "ITEMS" ? "Items" : "Categories"}: ${(offer.applicable_names||[]).join(", ")}`}</small><small>{offer.per_customer_limit ? `${offer.per_customer_limit} use(s) per customer` : "No per-customer limit"}{offer.starts_at ? ` · Starts ${new Date(offer.starts_at).toLocaleString()}` : ""}{offer.ends_at ? ` · Ends ${new Date(offer.ends_at).toLocaleString()}` : ""}</small></article>)}</div></section>}
                    <div className={`restaurant-about-info-grid${floors.length ? " has-floors" : ""}`}>
                      {floors.length > 0 && <section className="restaurant-about-card"><div className="restaurant-about-card-heading"><div><span>SEATING</span><h3>Floor & table availability</h3></div><Armchair size={18} /></div><div className="restaurant-about-floor-list">{floors.map((floor) => {
                        const tables = floor.tables || [];
                        const available = tables.filter((table) => table.status === "available").length;
                        return <div className="restaurant-about-floor" key={floor.id}><span><strong>{floor.name}</strong><small>{tables.length} {tables.length === 1 ? "table" : "tables"}</small></span><b className={available ? "available" : "full"}>{available} available</b></div>;
                      })}</div></section>}
                      <section className="restaurant-about-card restaurant-about-hours"><div className="restaurant-about-card-heading"><div><span>PLAN YOUR VISIT</span><h3>Operating hours</h3></div><Clock3 size={18} /></div>{restaurant.hours?.length ? <div className="restaurant-about-hours-list">{restaurant.hours.map((hour) => <div className="restaurant-hour-row" key={hour.day}><span>{hour.day}</span><span className={hour.enabled ? "" : "closed"}>{hour.enabled ? (hour.periods?.length ? hour.periods.map((period) => `${period.opens} – ${period.closes}`).join(" · ") : `${hour.opens || "—"} – ${hour.closes || "—"}`) : "Closed"}</span></div>)}</div> : <p>Operating hours have not been added yet.</p>}</section>
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
                        <div className="customer-menu-discovery"><label>Search dishes<input type="search" value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder="Dish name or description" /></label><label>Sort dishes<select value={menuSort} onChange={(event) => setMenuSort(event.target.value)}><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label><span>{filteredMenuFoods.length} available dishes</span></div>
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
                                  <span>{category.foods.filter((food) => food.is_available && (!menuNeedle || `${food.name} ${food.description || ""} ${category.name}`.toLowerCase().includes(menuNeedle))).length}</span>
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
                              {visibleMenuFoods.length === 0 ? (
                                <p className="customer-menu-message">
                                  {category.foods.length ? "No available dishes match your search." : "No dishes are listed in this category yet."}
                                </p>
                              ) : (
                                <div className="customer-menu-grid">
                                  {visibleMenuFoods.map((food) => (
                                    <article
                                      className={`customer-menu-card ${food.is_available ? "" : "unavailable"}`}
                                      key={food.id}
                                    >
                                      {food.image_url ? (
                                        <img
                                          className="customer-menu-image"
                                          src={food.image_url}
                                          alt={food.name}
                                          loading="lazy"
                                        />
                                      ) : <div className="customer-menu-image-placeholder" aria-label={`${food.name} image unavailable`}><Utensils size={26} /></div>}
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
                                              <li key={variant.id}><span>{variant.name}</span><strong>₹{Number(variant.price).toFixed(2)}</strong><span className="customer-menu-service-note">Order at reception</span></li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                              {filteredMenuFoods.length > menuPageSize && <Pagination page={menuPage} pageSize={menuPageSize} total={filteredMenuFoods.length} onPageChange={setMenuPage} label="menu items" className="customer-menu-pagination" />}
                            </div>
                          ))}
                      </>
                    )}
                  </section>
                )}
                {activeSection === "reviews" && (
                  <section className="restaurant-detail-section restaurant-reviews-section">
                    <header className="customer-review-heading">
                      <div><span className="customer-menu-eyebrow">GUEST FEEDBACK</span><h2><Star size={18} /> Customer Reviews</h2></div>
                      <span>{restaurantReviews.filter((review) => !review.status || review.status === "PUBLISHED").length} reviews · {restaurantReviews.filter((review) => !review.status || review.status === "PUBLISHED").length ? (restaurantReviews.filter((review) => !review.status || review.status === "PUBLISHED").reduce((sum, review) => sum + review.rating, 0) / restaurantReviews.filter((review) => !review.status || review.status === "PUBLISHED").length).toFixed(1) : "—"} average</span>
                    </header>
                    {reviewError && <p className="customer-review-alert" role="alert">{reviewError}</p>}
                    {reviewMessage && <p className="customer-review-success" role="status">{reviewMessage}</p>}
                    {user && (!hasPublishedOwnReview || editingReviewId) ? <form className="customer-review-form" onSubmit={submitRestaurantReview}>
                      <h3>{editingReviewId ? "Edit your review" : "Share your experience"}</h3>
                      <label>Completed order<select required value={reviewForm.order_id} disabled={!!editingReviewId} onChange={(event) => setReviewForm({ ...reviewForm, order_id: event.target.value })}><option value="">Select an eligible order</option>{editingReviewId && reviewForm.order_id && <option value={reviewForm.order_id}>Your original completed order</option>}{eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.restaurant_name || restaurant.name} · {new Date(order.created_at).toLocaleDateString()}</option>)}</select></label>
                      <fieldset className="customer-review-rating"><legend>Your rating</legend><div className="customer-review-star-picker" aria-label="Choose a rating from one to five stars" onMouseLeave={() => setHoverRating(0)}>{[1,2,3,4,5].map((rating) => <button key={rating} type="button" aria-pressed={reviewForm.rating === rating} aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`} className={(hoverRating || reviewForm.rating) >= rating ? "selected" : ""} onMouseEnter={() => setHoverRating(rating)} onFocus={() => setHoverRating(rating)} onBlur={() => setHoverRating(0)} onClick={() => setReviewForm({ ...reviewForm, rating })}>★</button>)}</div><span aria-live="polite">{(hoverRating || reviewForm.rating)} out of 5 stars</span></fieldset>
                      <label>Your review<textarea required minLength={3} maxLength={5000} value={reviewForm.content} onChange={(event) => setReviewForm({ ...reviewForm, content: event.target.value })} placeholder={`How was your visit to ${restaurant.name}?`} /></label>
                      <div className="customer-review-actions"><button type="submit" disabled={reviewBusy || !reviewForm.order_id}>{reviewBusy ? "Saving…" : editingReviewId ? "Save changes" : "Submit review"}</button>{editingReviewId && <button type="button" className="secondary" onClick={() => { setEditingReviewId(null); setReviewForm({ order_id: "", rating: 5, content: "" }); }}>Cancel</button>}</div>
                      {!eligibleOrders.length && !editingReviewId && <small>A completed food order at this restaurant is required to review it. Reservations alone do not count as completed orders.</small>}
                    </form> : !user ? <p><Link to="/customer/login">Sign in</Link> to write a review after a completed order.</p> : null}
                    <div className="customer-review-list">
                      {reviewLoading ? <p role="status">Loading reviews…</p> : restaurantReviews.length === 0 ? <p>No reviews yet. Be the first to share your experience after a completed order.</p> : restaurantReviews.map((review) => <article className="customer-review-card" key={review.id}>
                        <div className="customer-review-card-heading"><strong>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)} <span>{review.food_name ? `· ${review.food_name}` : "Restaurant review"}</span></strong><small>{new Date(review.created_at).toLocaleDateString()}</small></div>
                        <p>{review.content}</p>{review.reply && <div className="customer-review-reply"><strong>Restaurant response</strong><p>{review.reply.content}</p></div>}
                        <div className="customer-review-actions">{review.is_mine && review.status === "PUBLISHED" && <button type="button" className="secondary" onClick={() => { setEditingReviewId(review.id); setReviewForm({ order_id: review.order_id, rating: review.rating, content: review.content }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit your review</button>}{user && !review.is_mine && !review.status && flaggingReviewId !== review.id && <button type="button" className="secondary" onClick={() => setFlaggingReviewId(review.id)}>Report review</button>}</div>
                        {flaggingReviewId === review.id && <div className="customer-review-flag"><label>Reason<select value={flagReason} onChange={(event) => setFlagReason(event.target.value)}>{[["SPAM","Spam"],["ABUSIVE","Abusive language"],["HARASSMENT","Harassment"],["MISLEADING","Misleading content"],["OTHER","Other"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Explanation (optional)<textarea maxLength={1000} value={flagExplanation} onChange={(event) => setFlagExplanation(event.target.value)} /></label><div className="customer-review-actions"><button type="button" onClick={() => flagRestaurantReview(review.id)}>Submit report</button><button type="button" className="secondary" onClick={() => setFlaggingReviewId(null)}>Cancel</button></div></div>}
                      </article>)}
                    </div>
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
                          <option value="NEWEST">Created: newest first</option><option value="OLDEST">Created: oldest first</option><option value="FEE_LOW">Fee: low to high</option><option value="FEE_HIGH">Fee: high to low</option>
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
                        <Pagination page={currentReservationPage} pageSize={reservationsPerPage} total={sortedReservations.length} onPageChange={setReservationPage} label="reservations" />
                      </>}
                    </section>
                    {selectedReservation && <div className="reservation-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReservation(null); }}>
                      <section className="reservation-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title">
                        <button type="button" className="reservation-detail-close" aria-label="Close reservation details" onClick={() => setSelectedReservation(null)}><X size={18} /></button>
                        <span className="reservation-card-eyebrow">RESERVATION DETAILS</span>
                        <div className="reservation-detail-title-row"><h3 id="reservation-detail-title">{restaurant.name}</h3><span className={`reservation-status-pill status-${selectedReservation.status.toLowerCase().replaceAll("_", "-")}`}>{({ PENDING_PAYMENT: "Payment due", CONFIRMED: "Confirmed", CANCELLED: "Cancelled", COMPLETED: "Completed" })[selectedReservation.status] ?? selectedReservation.status.replaceAll("_", " ")}</span></div>
                        <p className="reservation-detail-reference">Reservation code · {reservationCode(selectedReservation)}</p>
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
                        <div className="reservation-detail-actions"><button type="button" className="reservation-detail-done" onClick={() => setSelectedReservation(null)}>Close</button>{["PENDING_PAYMENT", "CONFIRMED"].includes(selectedReservation.status) && <button type="button" className="reservation-detail-cancel" onClick={() => setPendingReservationCancellation(selectedReservation)}>Cancel reservation</button>}</div>
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
                  <CustomDatePicker id="booking-date" label="Reservation date" value={date} onChange={(value) => { setDate(value); setBookingMessage(""); }} />
                  <label htmlFor="booking-guests">Guests</label>
                  <CustomGuestPicker id="booking-guests" max={16} value={guests} onChange={(value) => { setGuests(value); setBookingMessage(""); }} />
                  <label htmlFor="booking-time">Preferred time</label>
                  <CustomTimePicker id="booking-time" label="Preferred reservation time" value={time} onChange={(value) => { setTime(value); setBookingMessage(""); }} />
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
                  <h2>Select your table</h2><p className="booking-note">{date} · {displayTime(time)} · {guests} {Number(guests) === 1 ? "guest" : "guests"}</p>
                  {availableTables.length ? <div className="customer-available-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={`customer-available-table${selectedTableId === table.id ? " selected" : ""}`} onClick={() => setSelectedTableId(table.id)}><span className="customer-table-check">{selectedTableId === table.id ? "✓" : ""}</span><span className="customer-table-copy"><strong>Table {table.table_number}</strong><small>{table.floor_name} · Seats up to {table.capacity}</small></span><strong className="customer-table-price">₹{Number(table.reservation_fee).toFixed(2)}</strong></button>)}</div> : <div className="customer-no-tables">No suitable tables are available for this date and time.</div>}
                  {bookingMessage && <p className="booking-message" role="status">{bookingMessage}</p>}
                  <div className="customer-reservation-actions"><button type="button" className="customer-booking-back" onClick={() => { setBookingStep(1); setBookingMessage(""); }}>Back</button><button type="button" className="booking-submit" disabled={!selectedTableId} onClick={() => setBookingStep(3)}>Continue to review</button></div>
                </section>}
                {bookingStep === 3 && (() => {
                  const selectedTable = availableTables.find((table) => table.id === selectedTableId);
                  return <section className="customer-review-step"><h2>Review reservation</h2><div className="customer-reservation-summary"><div><span>Restaurant</span><strong>{restaurant.name}</strong></div><div><span>Date</span><strong>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`))}</strong></div><div><span>Guests</span><strong>{guests}</strong></div><div><span>Preferred time</span><strong>{displayTime(time)}</strong></div><div><span>Selected table</span><strong>{selectedTable?.floor_name} · Table {selectedTable?.table_number}</strong></div><div className="customer-reservation-total"><span>Table booking fee</span><strong>₹{Number(selectedTable?.reservation_fee || 0).toFixed(2)}</strong></div></div><div className="customer-fee-notice"><strong>Payment required to confirm</strong><p>The restaurant will verify your payment. Your reservation remains pending until payment is recorded by the restaurant.</p></div>{bookingMessage && <p className="booking-message" role="alert">{bookingMessage}</p>}<div className="customer-reservation-actions"><button type="button" className="customer-booking-back" onClick={() => setBookingStep(2)}>Back</button><button type="button" className="booking-submit" disabled={bookingBusy} onClick={confirmReservation}>{bookingBusy ? "Submitting…" : "Submit reservation"}</button></div></section>;
                })()}
                {bookingStep === 4 && reservationResult && <section className="customer-reservation-confirmation"><div className="customer-reservation-confirm-icon">✓</div><span className="booking-eyebrow">RESERVATION REQUEST RECEIVED</span><h2>Payment pending</h2><p>Your table request is saved. The restaurant will confirm the reservation after receiving the ₹{Number(reservationResult.fee_amount).toFixed(2)} table fee.</p><div className="customer-reservation-summary"><div><span>Reservation code</span><strong>{reservationCode(reservationResult)}</strong></div><div><span>Date & time</span><strong>{reservationResult.reservation_date} · {displayTime(time)}</strong></div><div><span>Table</span><strong>{reservationResult.tables?.[0]?.floor_name} · Table {reservationResult.tables?.[0]?.table_number}</strong></div><div><span>Party size</span><strong>{reservationResult.number_of_guests} guests</strong></div><div className="customer-reservation-total"><span>Status</span><strong>Awaiting payment</strong></div></div><button type="button" className="customer-booking-back customer-new-booking" onClick={resetReservationFlow}>Start another reservation</button></section>}
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
      {pendingReservationCancellation && <ConfirmActionDialog action="cancel" resourceType="reservation" resourceName={restaurant?.name} title="Cancel this reservation?" description="If you cancel more than 24 hours after booking, the reservation fee is not refundable. Any paid preorder amount and other eligible refunds are credited to your DineBook wallet." busy={cancellingReservation} onCancel={() => { if (!cancellingReservation) setPendingReservationCancellation(null); }} onConfirm={async () => { const cancelled = await cancelMyReservation(pendingReservationCancellation); if (cancelled) setPendingReservationCancellation(null); }} />}
    </div>
  );
}
