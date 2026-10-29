import { useEffect, useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import {
  getSavedRestaurantIds,
  subscribeToSavedRestaurants,
  toggleSavedRestaurant,
} from "../../lib/savedRestaurants.js";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import "./CustomerSavedRestaurantsPage.css";
import "./CustomerProfilePage.css";

export default function CustomerSavedRestaurantsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [savedIds, setSavedIds] = useState(getSavedRestaurantIds);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(
    () =>
      subscribeToSavedRestaurants(() => setSavedIds(getSavedRestaurantIds())),
    [],
  );

  useEffect(() => {
    let active = true;
    requestJson("/api/customer/me")
      .then((data) => active && setUser(data))
      .catch(() => active && navigate("/customer/login", { replace: true }));
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    requestJson("/api/customer/restaurants")
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : null;
        if (!list) throw new Error("The restaurant list could not be read.");
        setRestaurants(list);
      })
      .catch(
        (reason) =>
          active &&
          setError(reason.message || "Saved restaurants could not be loaded."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const savedCuisineOptions = [
    ...new Set(
      restaurants
        .filter((item) => savedIds.includes(String(item.id)))
        .map((item) => item.cuisine)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const savedRestaurants = useMemo(
    () =>
      restaurants
        .filter((item) => savedIds.includes(String(item.id)))
        .filter(
          (item) =>
            (!query.trim() ||
              `${item.name || ""} ${item.location || ""} ${item.cuisine || ""}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())) &&
            (cuisine === "ALL" || item.cuisine === cuisine),
        )
        .sort((a, b) =>
          sort === "name-desc"
            ? (b.name || "").localeCompare(a.name || "")
            : sort === "cuisine"
              ? (a.cuisine || "").localeCompare(b.cuisine || "")
              : (a.name || "").localeCompare(b.name || ""),
        ),
    [restaurants, savedIds, query, cuisine, sort],
  );

  function removeSaved(id) {
    toggleSavedRestaurant(id);
    setSavedIds(getSavedRestaurantIds());
  }

  return (
    <ProfileFrame
      user={user}
      active="Saved Restaurants"
      variant="saved-restaurants-portal"
    >
      <section className="saved-restaurants-page saved-restaurants-panel">
        <header className="saved-restaurants-heading">
          <div>
            <span className="saved-restaurants-eyebrow">YOUR COLLECTION</span>
            <h1>Saved Restaurants</h1>
            <p>
              Keep your favorite places together so they’re easy to find again.
            </p>
          </div>
          <span className="saved-restaurants-count">
            {savedIds.length} saved
          </span>
        </header>
        {savedIds.length > 0 && (
          <div className="saved-restaurants-toolbar">
            <label>
              <Search size={17} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, cuisine, or location"
              />
            </label>
            <select
              aria-label="Filter by cuisine"
              value={cuisine}
              onChange={(event) => setCuisine(event.target.value)}
            >
              <option value="ALL">All cuisines</option>
              {savedCuisineOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort saved restaurants"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="name">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="cuisine">Cuisine</option>
            </select>
          </div>
        )}
        {loading ? (
          <div className="saved-restaurants-message" role="status">
            Loading your saved restaurants…
          </div>
        ) : error ? (
          <div className="saved-restaurants-message error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : savedRestaurants.length ? (
          <div className="saved-restaurants-grid">
            {savedRestaurants.map((restaurant) => (
              <article className="saved-restaurant-card" key={restaurant.id}>
                <Link
                  className="saved-restaurant-photo"
                  to={`/customer/restaurants/${restaurant.id}`}
                  style={{
                    backgroundImage: `url(${restaurant.image || restaurant.image_url || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900"})`,
                  }}
                  aria-label={`View ${restaurant.name}`}
                />
                <button
                  className="saved-restaurant-remove"
                  type="button"
                  aria-label={`Remove ${restaurant.name} from saved restaurants`}
                  onClick={() => removeSaved(restaurant.id)}
                >
                  <Heart size={18} fill="currentColor" />
                  Remove
                </button>
                <div className="saved-restaurant-info">
                  <span>{restaurant.cuisine || "Restaurant"}</span>
                  <h2>{restaurant.name}</h2>
                  <p>{restaurant.location || "Location not listed"}</p>
                  <Link to={`/customer/restaurants/${restaurant.id}`}>
                    View restaurant
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="saved-restaurants-empty">
            <Heart size={28} />
            <h2>
              {savedIds.length
                ? "No matching restaurants"
                : "Your saved list is empty"}
            </h2>
            <p>
              {savedIds.length
                ? "Try another search or clear your cuisine filter."
                : "Tap the heart on a restaurant to save it here for later."}
            </p>
            <Link to="/customer/restaurants">Explore restaurants</Link>
          </section>
        )}
      </section>
    </ProfileFrame>
  );
}
