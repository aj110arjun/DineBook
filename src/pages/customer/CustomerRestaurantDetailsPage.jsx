import { usePageState } from "../../state/usePageState.js";
import { formatLocalDate, formatLocalTime, formatWallTime } from "../../lib/localDate.js";
import { confirmAction } from "../../lib/confirmDialog.js";
import CustomForm from "../../components/forms/CustomForm.jsx";
import { useEffect } from "react";
import {
  Accessibility,
  Armchair,
  ArrowLeft,
  Baby,
  CalendarDays,
  CarFront,
  X,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Star,
  Utensils,
  Wifi,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import RestaurantOffers from "../../components/landing/RestaurantOffers.jsx";
import RestaurantBookingDock from "../../components/RestaurantBookingDock.jsx";
import Pagination from "../../components/Pagination.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { saveReservation } from "../../data/customerReservations.js";
import { photo } from "../../data/landingData.js";
import "../../assets/css/CustomerRestaurantReviews.css";
import "../../assets/css/CustomerRestaurantAmenities.css";

const detailTabs = [
  { id: "about", label: "About" },
  { id: "amenities", label: "Amenities" },
  { id: "menu-preview", label: "Menu" },
  { id: "reviews", label: "Reviews" },
];
export default function CustomerRestaurantDetailsPage() {
  const { restaurantId, section } = useParams();
  const navigate = useNavigate();
  const [
    {
      restaurant, user, loading, error, bookingOpen, myReservations,
      selectedOrderReservationId, restaurantReviews, reviewLoading,
      loadedReviewScope,
    },
    {
      restaurant: setRestaurant, user: setUser, loading: setLoading,
      error: setError, bookingOpen: setBookingOpen,
      myReservations: setMyReservations,
      selectedOrderReservationId: setSelectedOrderReservationId,
      restaurantReviews: setRestaurantReviews, reviewLoading: setReviewLoading,
      loadedReviewScope: setLoadedReviewScope,
    },
  ] = usePageState("CustomerRestaurantDetailsPage", () => ({
    restaurant: null,
    user: null,
    loading: true,
    error: "",
    bookingOpen: false,
    myReservations: [],
    selectedOrderReservationId: "",
    restaurantReviews: [],
    reviewLoading: false,
    loadedReviewScope: null,
  }));
  const reviewScope = `${restaurantId}:${user?.id || user?.email || "guest"}`;
  const [
    {
      reviewError, reviewMessage, reviewCooldownUntil, reviewBusy, reviewForm,
      hoverRating, editingReviewId, flaggingReviewId, flagReason, flagExplanation,
      reservationStatusFilter, reservationDateFilter, reservationSort,
      reservationPage, selectedReservation, pendingReservationCancellation,
      cancellingReservation, menuCategories, restaurantOffers, floors,
      menuLoading, menuError, selectedMenuCategoryId, menuQuery, menuSort,
      menuPage,
    },
    {
      reviewError: setReviewError, reviewMessage: setReviewMessage,
      reviewCooldownUntil: setReviewCooldownUntil, reviewBusy: setReviewBusy,
      reviewForm: setReviewForm, hoverRating: setHoverRating,
      editingReviewId: setEditingReviewId, flaggingReviewId: setFlaggingReviewId,
      flagReason: setFlagReason, flagExplanation: setFlagExplanation,
      reservationStatusFilter: setReservationStatusFilter,
      reservationDateFilter: setReservationDateFilter,
      reservationSort: setReservationSort, reservationPage: setReservationPage,
      selectedReservation: setSelectedReservation,
      pendingReservationCancellation: setPendingReservationCancellation,
      cancellingReservation: setCancellingReservation,
      menuCategories: setMenuCategories, restaurantOffers: setRestaurantOffers,
      floors: setFloors, menuLoading: setMenuLoading, menuError: setMenuError,
      selectedMenuCategoryId: setSelectedMenuCategoryId, menuQuery: setMenuQuery,
      menuSort: setMenuSort, menuPage: setMenuPage,
    },
  ] = usePageState("CustomerRestaurantDetailsPage", () => ({
    reviewError: "",
    reviewMessage: "",
    reviewCooldownUntil: null,
    reviewBusy: false,
    reviewForm: {
      rating: 5,
      content: ""
    },
    hoverRating: 0,
    editingReviewId: null,
    flaggingReviewId: null,
    flagReason: "SPAM",
    flagExplanation: "",
    reservationStatusFilter: "ALL",
    reservationDateFilter: "",
    reservationSort: "NEWEST",
    reservationPage: 1,
    selectedReservation: null,
    pendingReservationCancellation: null,
    cancellingReservation: false,
    menuCategories: [],
    restaurantOffers: [],
    floors: [],
    menuLoading: false,
    menuError: "",
    selectedMenuCategoryId: "",
    menuQuery: "",
    menuSort: "name",
    menuPage: 1,
  }));
  const activeSection = detailTabs.some((tab) => tab.id === section)
    ? section
    : "about";
  const [
    {
      reservationTotal, reservationListError, reservationListLoading,
      seatedReservations, visibleMenuFoods, menuTotal,
    },
    {
      reservationTotal: setReservationTotal,
      reservationListError: setReservationListError,
      reservationListLoading: setReservationListLoading,
      seatedReservations: setSeatedReservations,
      visibleMenuFoods: setVisibleMenuFoods, menuTotal: setMenuTotal,
    },
  ] = usePageState("CustomerRestaurantDetailsPage", () => ({
    reservationTotal: 0,
    reservationListError: "",
    reservationListLoading: false,
    seatedReservations: [],
    visibleMenuFoods: [],
    menuTotal: 0,
  }));
  const reservationsPerPage = 4;
  const reservationPageCount = Math.max(
    1,
    Math.ceil(reservationTotal / reservationsPerPage),
  );
  const currentReservationPage = reservationPage;
  const pagedReservations = myReservations;
  const menuPageSize = 8;
  useEffect(() => {
    if (section === "reservations") {
      navigate(`/customer/restaurants/${restaurantId}/about`, { replace: true });
    }
  }, [section, restaurantId, navigate]);

  useEffect(() => {
    setMenuPage(1);
  }, [menuQuery, menuSort, selectedMenuCategoryId]);

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
    requestJson(
      `/api/customer/orders/offers?restaurant_id=${encodeURIComponent(restaurantId)}`,
    )
      .then((data) => mounted && setRestaurantOffers(data))
      .catch(() => mounted && setRestaurantOffers([]));
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (activeSection !== "menu-preview") return undefined;
    let mounted = true;
    setMenuLoading(true);
    setMenuError("");
    const params = new URLSearchParams({
      page: menuPage,
      page_size: menuPageSize,
      search: menuQuery,
      sort: menuSort,
    });
    if (selectedMenuCategoryId)
      params.set("category_id", selectedMenuCategoryId);
    requestJson(`/api/customer/restaurants/${restaurantId}/menu?${params}`)
      .then((data) => {
        if (!mounted) return;
        setMenuCategories(data.categories);
        setVisibleMenuFoods(data.items);
        setMenuTotal(data.total);
      })
      .catch((reason) => mounted && setMenuError(reason.message))
      .finally(() => mounted && setMenuLoading(false));
    return () => {
      mounted = false;
    };
  }, [
    restaurantId,
    activeSection,
    menuPage,
    menuQuery,
    menuSort,
    selectedMenuCategoryId,
  ]);

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
    let alive = true;
    setReservationListLoading(true);
    setReservationListError("");
    const params = new URLSearchParams({
      page: reservationPage,
      page_size: reservationsPerPage,
      restaurant_id: restaurantId,
      status: reservationStatusFilter,
      sort: {
        NEWEST: "created-newest",
        OLDEST: "created-oldest",
        FEE_LOW: "fee-low",
        FEE_HIGH: "fee-high",
      }[reservationSort],
    });
    if (reservationDateFilter) {
      params.set("date_from", reservationDateFilter);
      params.set("date_to", reservationDateFilter);
    }
    requestJson(`/api/customer/reservations?${params}`)
      .then((data) => {
        if (!alive) return;
        setMyReservations(data.items);
        setReservationTotal(data.total);
        if (
          reservationPage >
          Math.max(1, Math.ceil(data.total / reservationsPerPage))
        )
          setReservationPage(1);
      })
      .catch((reason) => alive && setReservationListError(reason.message))
      .finally(() => alive && setReservationListLoading(false));
    return () => {
      alive = false;
    };
  }, [
    user,
    restaurantId,
    reservationPage,
    reservationStatusFilter,
    reservationDateFilter,
    reservationSort,
  ]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    requestJson(
      `/api/customer/reservations?page=1&page_size=100&restaurant_id=${restaurantId}&status=SEATED`,
    )
      .then((data) => {
        if (!alive) return;
        setSeatedReservations(data.items);
        setSelectedOrderReservationId((current) =>
          data.items.some((item) => item.id === current)
            ? current
            : data.items[0]?.id || "",
        );
      })
      .catch(() => alive && setSeatedReservations([]));
    return () => {
      alive = false;
    };
  }, [user, restaurantId]);

  useEffect(() => {
    if (activeSection !== "reviews") return undefined;
    let mounted = true;
    setReviewLoading(true);
    setLoadedReviewScope(null);
    setReviewError("");
    setEditingReviewId(null);
    Promise.all([
      requestJson(`/api/reviews/restaurants/${restaurantId}?limit=50&offset=0`),
      user ? requestJson("/api/customer/reviews") : Promise.resolve([]),
    ])
      .then(([publicReviews, mine]) => {
        if (!mounted) return;
        const ownRestaurantReviews = (mine || []).filter(
          (review) => String(review.restaurant_id) === String(restaurantId),
        );
        const activeCooldown =
          ownRestaurantReviews
            .map((review) => review.manager_flagged_until)
            .filter((until) => until && Date.parse(until) > Date.now())
            .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
        setReviewCooldownUntil(activeCooldown);
        // Merge once so a slower public response cannot erase ownership metadata.
        const ownReviews = ownRestaurantReviews.filter(
          (review) => review.status !== "REMOVED",
        );
        const ownIds = new Set(ownReviews.map((review) => review.id));
        setRestaurantReviews([
          ...ownReviews,
          ...(publicReviews.items || []).filter(
            (review) => !ownIds.has(review.id),
          ),
        ]);
        setLoadedReviewScope(reviewScope);
      })
      .catch((reason) => {
        if (mounted) setReviewError(reason.message);
      })
      .finally(() => {
        if (mounted) setReviewLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeSection, user, restaurantId, reviewScope]);

  async function submitRestaurantReview(event) {
    event.preventDefault();
    setReviewBusy(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const saved = await requestJson(
        editingReviewId
          ? `/api/customer/reviews/${editingReviewId}`
          : "/api/customer/reviews",
        {
          method: editingReviewId ? "PATCH" : "POST",
          body: JSON.stringify({
            restaurant_id: restaurantId,
            rating: reviewForm.rating,
            content: reviewForm.content,
          }),
        },
      );
      setRestaurantReviews((current) => [
        { ...saved, is_mine: true },
        ...current.filter((review) => review.id !== saved.id),
      ]);
      setReviewForm({ rating: 5, content: "" });
      setEditingReviewId(null);
      setReviewMessage(
        editingReviewId
          ? "Your review was updated."
          : "Thanks, your review was submitted.",
      );
    } catch (reason) {
      setReviewError(reason.message);
    } finally {
      setReviewBusy(false);
    }
  }

  async function flagRestaurantReview(reviewId) {
    try {
      await requestJson(`/api/customer/reviews/${reviewId}/flags`, {
        method: "POST",
        body: JSON.stringify({
          reason: flagReason,
          explanation: flagExplanation || null,
        }),
      });
      setFlaggingReviewId(null);
      setFlagExplanation("");
      setReviewMessage("Your report was submitted to the moderation team.");
    } catch (reason) {
      setReviewError(reason.message);
    }
  }

  async function deleteOwnRestaurantReview(reviewId) {
    if (
      !(await confirmAction(
        "Delete your review for this restaurant? This cannot be undone.",
      ))
    )
      return;
    try {
      await requestJson(`/api/customer/reviews/${reviewId}`, {
        method: "DELETE",
      });
      setRestaurantReviews((current) =>
        current.filter((review) => review.id !== reviewId),
      );
      setReviewMessage("Your review was deleted.");
      setEditingReviewId(null);
      setReviewForm({ rating: 5, content: "" });
    } catch (reason) {
      setReviewError(reason.message);
    }
  }

  const gallery = restaurant?.images?.length
    ? restaurant.images
    : restaurant?.image
      ? [restaurant.image]
      : [photo("photo-1517248135467-4c7edcad34c4", 1400)];
  async function cancelMyReservation(item) {
    setCancellingReservation(true);
    try {
      await requestJson(`/api/customer/reservations/${item.id}/cancel`, {
        method: "POST",
      });
      const updated = { ...item, status: "CANCELLED" };
      saveReservation(user?.email, updated);
      setMyReservations((current) =>
        current.map((reservation) =>
          reservation.id === item.id ? updated : reservation,
        ),
      );
      setSelectedReservation(updated);
      return true;
    } catch (reason) {
      setBookingMessage(reason.message);
      return false;
    } finally {
      setCancellingReservation(false);
    }
  }

  const hasOwnReview = restaurantReviews.some((review) => review.is_mine);
  const reviewCooldownActive = Boolean(
    reviewCooldownUntil && Date.parse(reviewCooldownUntil) > Date.now(),
  );
  const reviewCooldownTime = reviewCooldownActive
    ? formatLocalTime(reviewCooldownUntil)
    : "";

  return (
    <div className="customer-home restaurant-details-home">
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

            <div className="restaurant-details-layout no-booking">
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
                  <button
                    type="button"
                    className="restaurant-detail-availability-link"
                    aria-haspopup="dialog"
                    aria-controls="restaurant-booking-dialog"
                    aria-expanded={bookingOpen}
                    onClick={() => setBookingOpen(true)}
                  >
                    <CalendarDays size={14} /> Check availability
                  </button>
                </nav>

                {activeSection === "about" && (
                  <section className="restaurant-detail-section restaurant-about-section">
                    <header className="restaurant-about-intro">
                      <span className="restaurant-about-eyebrow">
                        RESTAURANT GUIDE
                      </span>
                      <h2>About {restaurant.name}</h2>
                      <p>
                        {restaurant.description ||
                          "More information about this restaurant will be available soon."}
                      </p>
                    </header>
                    <RestaurantOffers
                      key={restaurantId}
                      offers={restaurantOffers.filter(
                        (offer) => offer.status !== "EXPIRED",
                      )}
                    />
                    <div
                      className={`restaurant-about-info-grid${floors.length ? " has-floors" : ""}`}
                    >
                      {floors.length > 0 && (
                        <section className="restaurant-about-card">
                          <div className="restaurant-about-card-heading">
                            <div>
                              <span>SEATING</span>
                              <h3>Floor & table availability</h3>
                            </div>
                            <Armchair size={18} />
                          </div>
                          <div className="restaurant-about-floor-list">
                            {floors.map((floor) => {
                              const tables = floor.tables || [];
                              const available = tables.filter(
                                (table) => table.status === "available",
                              ).length;
                              return (
                                <div
                                  className="restaurant-about-floor"
                                  key={floor.id}
                                >
                                  <span>
                                    <strong>{floor.name}</strong>
                                    <small>
                                      {tables.length}{" "}
                                      {tables.length === 1 ? "table" : "tables"}
                                    </small>
                                  </span>
                                  <b
                                    className={available ? "available" : "full"}
                                  >
                                    {available} available
                                  </b>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}
                      <section className="restaurant-about-card restaurant-about-hours">
                        <div className="restaurant-about-card-heading">
                          <div>
                            <span>PLAN YOUR VISIT</span>
                            <h3>Operating hours</h3>
                          </div>
                          <Clock3 size={18} />
                        </div>
                        {restaurant.hours?.length ? (
                          <div className="restaurant-about-hours-list">
                            {restaurant.hours.map((hour) => (
                              <div
                                className="restaurant-hour-row"
                                key={hour.day}
                              >
                                <span>{hour.day}</span>
                                <span className={hour.enabled ? "" : "closed"}>
                                  {hour.enabled
                                    ? hour.periods?.length
                                      ? hour.periods
                                          .map(
                                            (period) =>
                                              `${formatWallTime(period.opens)} – ${formatWallTime(period.closes)}`,
                                          )
                                          .join(" · ")
                                      : `${formatWallTime(hour.opens)} – ${formatWallTime(hour.closes)}`
                                    : "Closed"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>Operating hours have not been added yet.</p>
                        )}
                      </section>
                    </div>
                  </section>
                )}

                {activeSection === "amenities" && (
                  <section className="restaurant-detail-section restaurant-amenities-section">
                    <span className="restaurant-about-eyebrow">
                      PLAN YOUR VISIT
                    </span>
                    <h2>Amenities</h2>
                    <p className="restaurant-amenities-intro">
                      Amenities are the facilities and services that can make a
                      meal more comfortable. Checking them before you book helps
                      you choose a restaurant that suits your needs.
                    </p>
                    <div className="restaurant-amenities-notice">
                      <strong>What’s available at {restaurant.name}?</strong>
                      <p>
                        This restaurant hasn’t shared its amenities yet. The
                        examples below are things you may want to ask about;
                        they are not confirmed at this location.
                      </p>
                      {(restaurant.phone || restaurant.email) && (
                        <div className="restaurant-amenities-contact">
                          {restaurant.phone && (
                            <a href={`tel:${restaurant.phone}`}>
                              <Phone size={16} /> Call restaurant
                            </a>
                          )}
                          {restaurant.email && (
                            <a href={`mailto:${restaurant.email}`}>
                              <Mail size={16} /> Email restaurant
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <h3>Helpful things to check before visiting</h3>
                    <div className="restaurant-amenities-grid">
                      <article>
                        <Accessibility size={22} />
                        <h4>Accessibility</h4>
                        <p>
                          Ask about step-free entry, accessible seating, and
                          restrooms.
                        </p>
                      </article>
                      <article>
                        <CarFront size={22} />
                        <h4>Parking</h4>
                        <p>
                          Check whether parking or valet service is available
                          nearby.
                        </p>
                      </article>
                      <article>
                        <Wifi size={22} />
                        <h4>Connectivity</h4>
                        <p>
                          Find out if guests can use Wi-Fi during their visit.
                        </p>
                      </article>
                      <article>
                        <Baby size={22} />
                        <h4>Family needs</h4>
                        <p>Ask about high chairs or space for strollers.</p>
                      </article>
                    </div>
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
                          Browse dishes and available options. Place your order
                          at reception.
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
                        <div className="customer-menu-discovery">
                          <label>
                            Search dishes
                            <input
                              type="search"
                              value={menuQuery}
                              onChange={(event) =>
                                setMenuQuery(event.target.value)
                              }
                              placeholder="Dish name or description"
                            />
                          </label>
                          <label>
                            Sort dishes
                            <select
                              value={menuSort}
                              onChange={(event) =>
                                setMenuSort(event.target.value)
                              }
                            >
                              <option value="name">Name A–Z</option>
                              <option value="name-desc">Name Z–A</option>
                              <option value="price-low">
                                Price: low to high
                              </option>
                              <option value="price-high">
                                Price: high to low
                              </option>
                            </select>
                          </label>
                          <span>{menuTotal} available dishes</span>
                        </div>
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
                              <span>{category.count}</span>
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
                                  {category.count
                                    ? "No available dishes match your search."
                                    : "No dishes are listed in this category yet."}
                                </p>
                              ) : (
                                <div className="customer-menu-grid">
                                  {visibleMenuFoods.map((food) => (
                                    <article
                                      className={`customer-menu-card ${food.is_available ? "" : "unavailable"}`}
                                      key={food.id}
                                      tabIndex={0}
                                    >
                                      {food.image_url ? (
                                        <img
                                          className="customer-menu-image"
                                          src={food.image_url}
                                          alt={food.name}
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div
                                          className="customer-menu-image-placeholder"
                                          aria-label={`${food.name} image unavailable`}
                                        >
                                          <Utensils size={26} />
                                        </div>
                                      )}
                                      <div className="customer-menu-hover-details">
                                        <h4>{food.name}</h4>
                                        <p>
                                          {food.description?.trim() ||
                                            "No description has been added for this dish."}
                                        </p>
                                      </div>
                                      {!(food.variants || []).some(
                                        (variant) => variant.is_available,
                                      ) && (
                                        <p className="customer-menu-description">
                                          No options are currently available.
                                        </p>
                                      )}
                                    </article>
                                  ))}
                                </div>
                              )}
                              {menuTotal > menuPageSize && (
                                <Pagination
                                  page={menuPage}
                                  pageSize={menuPageSize}
                                  total={menuTotal}
                                  onPageChange={setMenuPage}
                                  label="menu items"
                                  className="customer-menu-pagination"
                                />
                              )}
                            </div>
                          ))}
                      </>
                    )}
                  </section>
                )}
                {activeSection === "reviews" && (
                  <section className="restaurant-detail-section restaurant-reviews-section">
                    <header className="customer-review-heading">
                      <div>
                        <span className="customer-menu-eyebrow">
                          GUEST FEEDBACK
                        </span>
                        <h2>
                          <Star size={18} /> Customer Reviews
                        </h2>
                      </div>
                      <span>
                        {
                          restaurantReviews.filter(
                            (review) =>
                              !review.status || review.status === "PUBLISHED",
                          ).length
                        }{" "}
                        reviews ·{" "}
                        {restaurantReviews.filter(
                          (review) =>
                            !review.status || review.status === "PUBLISHED",
                        ).length
                          ? (
                              restaurantReviews
                                .filter(
                                  (review) =>
                                    !review.status ||
                                    review.status === "PUBLISHED",
                                )
                                .reduce(
                                  (sum, review) => sum + review.rating,
                                  0,
                                ) /
                              restaurantReviews.filter(
                                (review) =>
                                  !review.status ||
                                  review.status === "PUBLISHED",
                              ).length
                            ).toFixed(1)
                          : "—"}{" "}
                        average
                      </span>
                    </header>
                    {reviewError && (
                      <p className="customer-review-alert" role="alert">
                        {reviewError}
                      </p>
                    )}
                    {reviewMessage && (
                      <p className="customer-review-success" role="status">
                        {reviewMessage}
                      </p>
                    )}
                    {reviewCooldownActive && (
                      <p className="customer-review-alert" role="status">
                        You can’t submit or edit a review for 24 hours after it
                        is flagged by the restaurant manager. You can review
                        again after {reviewCooldownTime}.
                      </p>
                    )}
                    {user &&
                    loadedReviewScope === reviewScope &&
                    !reviewCooldownActive &&
                    (!hasOwnReview || editingReviewId) ? (
                      <CustomForm
                        className="customer-review-form"
                        onSubmit={submitRestaurantReview}
                      >
                        <h3>
                          {editingReviewId
                            ? "Edit your review"
                            : "Share your experience"}
                        </h3>
                        <fieldset className="customer-review-rating">
                          <legend>Your rating</legend>
                          <div
                            className="customer-review-star-picker"
                            aria-label="Choose a rating from one to five stars"
                            onMouseLeave={() => setHoverRating(0)}
                          >
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                aria-pressed={reviewForm.rating === rating}
                                aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
                                className={
                                  (hoverRating || reviewForm.rating) >= rating
                                    ? "selected"
                                    : ""
                                }
                                onMouseEnter={() => setHoverRating(rating)}
                                onFocus={() => setHoverRating(rating)}
                                onBlur={() => setHoverRating(0)}
                                onClick={() =>
                                  setReviewForm({ ...reviewForm, rating })
                                }
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <span aria-live="polite">
                            {hoverRating || reviewForm.rating} out of 5 stars
                          </span>
                        </fieldset>
                        <label>
                          Your review
                          <textarea
                            required
                            minLength={3}
                            maxLength={5000}
                            value={reviewForm.content}
                            onChange={(event) =>
                              setReviewForm({
                                ...reviewForm,
                                content: event.target.value,
                              })
                            }
                            placeholder={`How was your visit to ${restaurant.name}?`}
                          />
                        </label>
                        <div className="customer-review-actions">
                          <button type="submit" disabled={reviewBusy}>
                            {reviewBusy
                              ? "Saving…"
                              : editingReviewId
                                ? "Save changes"
                                : "Submit restaurant review"}
                          </button>
                          {editingReviewId && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setEditingReviewId(null);
                                setReviewForm({ rating: 5, content: "" });
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </CustomForm>
                    ) : !user ? (
                      <p>
                        <Link to="/customer/login">Sign in</Link> to rate this
                        restaurant.
                      </p>
                    ) : null}
                    <div className="customer-review-list">
                      {reviewLoading ? (
                        <p role="status">Loading reviews…</p>
                      ) : restaurantReviews.filter(
                          (review) =>
                            !review.status || review.status === "PUBLISHED",
                        ).length === 0 ? (
                        <p>
                          No reviews yet. Be the first to rate this restaurant.
                        </p>
                      ) : (
                        restaurantReviews
                          .filter(
                            (review) =>
                              !review.status || review.status === "PUBLISHED",
                          )
                          .map((review) => (
                            <article
                              className="customer-review-card"
                              key={review.id}
                            >
                              <div className="customer-review-card-heading">
                                <strong>
                                  {"★".repeat(review.rating)}
                                  {"☆".repeat(5 - review.rating)}{" "}
                                  <span>
                                    {review.food_name
                                      ? `· ${review.food_name}`
                                      : "Restaurant review"}
                                  </span>
                                </strong>
                                <small>
                                  {formatLocalDate(review.created_at)}
                                </small>
                              </div>
                              <small className="customer-review-author">
                                By {review.customer_name || "Customer"}
                              </small>
                              <p>{review.content}</p>
                              {review.reply && (
                                <div className="customer-review-reply">
                                  <strong>Manager reply</strong>
                                  <p>{review.reply.content}</p>
                                  <small>
                                    {formatLocalDate(review.reply.updated_at)}
                                  </small>
                                </div>
                              )}
                              <div className="customer-review-actions">
                                {review.is_mine &&
                                  review.status === "PUBLISHED" &&
                                  !reviewCooldownActive && (
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => {
                                        setEditingReviewId(review.id);
                                        setReviewForm({
                                          rating: review.rating,
                                          content: review.content,
                                        });
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                    >
                                      Edit your review
                                    </button>
                                  )}
                                {review.is_mine && (
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() =>
                                      deleteOwnRestaurantReview(review.id)
                                    }
                                  >
                                    Delete your review
                                  </button>
                                )}
                                {user &&
                                  !review.is_mine &&
                                  !review.status &&
                                  flaggingReviewId !== review.id && (
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() =>
                                        setFlaggingReviewId(review.id)
                                      }
                                    >
                                      Report review
                                    </button>
                                  )}
                              </div>
                              {flaggingReviewId === review.id && (
                                <div className="customer-review-flag">
                                  <label>
                                    Reason
                                    <select
                                      value={flagReason}
                                      onChange={(event) =>
                                        setFlagReason(event.target.value)
                                      }
                                    >
                                      {[
                                        ["SPAM", "Spam"],
                                        ["ABUSIVE", "Abusive language"],
                                        ["HARASSMENT", "Harassment"],
                                        ["MISLEADING", "Misleading content"],
                                        ["OTHER", "Other"],
                                      ].map(([value, label]) => (
                                        <option key={value} value={value}>
                                          {label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label>
                                    Explanation (optional)
                                    <textarea
                                      maxLength={1000}
                                      value={flagExplanation}
                                      onChange={(event) =>
                                        setFlagExplanation(event.target.value)
                                      }
                                    />
                                  </label>
                                  <div className="customer-review-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        flagRestaurantReview(review.id)
                                      }
                                    >
                                      Submit report
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => setFlaggingReviewId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </article>
                          ))
                      )}
                    </div>
                  </section>
                )}
              </div>
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
      {!loading && !error && restaurant && (
        <RestaurantBookingDock
          key={restaurantId}
          restaurant={restaurant}
          open={bookingOpen}
          onOpenChange={setBookingOpen}
        />
      )}
      {pendingReservationCancellation && (
        <ConfirmActionDialog
          action="cancel"
          resourceType="reservation"
          resourceName={restaurant?.name}
          title="Cancel this reservation?"
          description="If you cancel more than 24 hours after booking, the reservation fee is not refundable. Any paid preorder amount and other eligible refunds are credited to your DineBook wallet."
          busy={cancellingReservation}
          onCancel={() => {
            if (!cancellingReservation) setPendingReservationCancellation(null);
          }}
          onConfirm={async () => {
            const cancelled = await cancelMyReservation(
              pendingReservationCancellation,
            );
            if (cancelled) setPendingReservationCancellation(null);
          }}
        />
      )}
    </div>
  );
}
