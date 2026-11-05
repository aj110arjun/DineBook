import { useEffect, useState } from "react";
import { MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import Pagination from "../../components/Pagination.jsx";
import RestaurantCard from "../../components/landing/RestaurantCard.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";

const PAGE_SIZE = 6;

export default function CustomerRestaurantListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => searchParams.get("search") || "");
  const [searchTerm, setSearchTerm] = useState(query);
  const [cuisines, setCuisines] = useState(() => searchParams.getAll("cuisine"));
  const [locations, setLocations] = useState(() => searchParams.getAll("location"));
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [guestCount, setGuestCount] = useState("4");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const value = searchParams.get("search") || "";
    setQuery(value);
    setSearchTerm(value);
    setCuisines(searchParams.getAll("cuisine"));
    setLocations(searchParams.getAll("location"));
    setPage(1);
  }, [searchParams]);

  function updateSearchUrl(value) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("search", value);
    else params.delete("search");
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = query.trim();
      setSearchTerm(value);
      if (value !== (searchParams.get("search") || "")) {
        const params = new URLSearchParams(searchParams);
        if (value) params.set("search", value);
        else params.delete("search");
        setSearchParams(params, { replace: true });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, searchParams, setSearchParams]);

  useEffect(() => {
    if (query.trim() !== searchTerm) { setLoading(true); return; }
    let mounted = true;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort,
    });
    if (searchTerm) params.set("search", searchTerm);
    cuisines.forEach((value) => params.append("cuisine", value));
    locations.forEach((value) => params.append("location", value));
    setLoading(true);
    setError("");
    const request =
      sort === "distance" && customerLocation
        ? requestJson("/api/customer/restaurants/nearby", {
            method: "POST",
            signal: controller.signal,
            body: JSON.stringify({
              latitude: customerLocation.latitude,
              longitude: customerLocation.longitude,
              search: searchTerm || null,
              cuisine: cuisines,
              location: locations,
              page,
              page_size: PAGE_SIZE,
            }),
          })
        : requestJson(`/api/customer/restaurants?${params.toString()}`, { signal: controller.signal });
    request
      .then((data) => {
        if (!mounted) return;
        setRestaurants(Array.isArray(data?.items) ? data.items : []);
        setTotalRestaurants(Number(data?.total) || 0);
        setCuisineOptions(Array.isArray(data?.cuisines) ? data.cuisines : []);
        setLocationOptions(
          Array.isArray(data?.locations) ? data.locations : [],
        );
      })
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [page, query, searchTerm, cuisines, locations, sort, customerLocation, refreshKey]);

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

  const visibleRestaurants = restaurants;

  function toggleFilter(value, setter) {
    const key = setter === setCuisines ? "cuisine" : "location";
    const current = setter === setCuisines ? cuisines : locations;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setter(next);
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    next.forEach((item) => params.append(key, item));
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
    setQuery("");
    setSearchTerm("");
    setCuisines([]);
    setLocations([]);
    setSort("newest");
    setCustomerLocation(null);
    setLocationError("");
    setPage(1);
  }

  function findNearbyRestaurants() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCustomerLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setSort("distance");
        setPage(1);
        setLocationBusy(false);
      },
      (reason) => {
        setLocationBusy(false);
        setLocationError(
          reason.code === 1
            ? "Allow location access to see nearby restaurants."
            : "Could not get your location. Please try again.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className="customer-home">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <section className="restaurant-listing-search">
        <div className="restaurant-listing-search-inner">
          <h1>Find your next table</h1>
          <p className="ux-search-intro">Search restaurants, compare menus, and choose a place for your next meal.</p>
          <form className="restaurant-search-bar" role="search" onSubmit={(event) => {
            event.preventDefault();
            setSearchTerm(query.trim());
            updateSearchUrl(query.trim());
            setPage(1);
            setRefreshKey((value) => value + 1);
          }}>
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search restaurants, cuisines, or locations…"
              aria-label="Search restaurants"
            />
            <button type="submit">Search</button>
          </form>
          <div className="restaurant-nearby-controls">
            <button
              type="button"
              onClick={findNearbyRestaurants}
              disabled={locationBusy}
            >
              <MapPin size={15} />
              {locationBusy
                ? "Finding location…"
                : sort === "distance"
                  ? "Refresh nearby results"
                  : "Find restaurants near me"}
            </button>
            {locationError && <span role="alert">{locationError}</span>}
          </div>
        </div>
      </section>

      <main className="restaurant-listing-page">
        <nav className="restaurant-listing-breadcrumb" aria-label="Breadcrumb">
          <Link to="/customer">Home</Link>
          <span aria-hidden="true">/</span>
          <strong aria-current="page">Restaurants</strong>
        </nav>
        <div className="restaurant-listing-layout">
          <aside className="restaurant-filter-panel">
            <div className="restaurant-filter-title">
              <h2>
                Filters
                {cuisines.length + locations.length > 0
                  ? ` · ${cuisines.length + locations.length}`
                  : ""}
              </h2>
              <div className="restaurant-filter-actions">
                <button type="button" onClick={clearFilters}>
                  Clear All
                </button>
                <button
                  className="restaurant-filter-toggle"
                  type="button"
                  aria-expanded={filtersOpen}
                  aria-controls="restaurant-filter-fields"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal size={17} />
                  {filtersOpen ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div
              id="restaurant-filter-fields"
              className={`restaurant-filter-fields${filtersOpen ? " is-open" : ""}`}
            >
              <section className="restaurant-filter-group">
                <h3>Cuisine</h3>
                {cuisineOptions.length ? (
                  cuisineOptions.map((cuisine) => (
                    <label key={cuisine}>
                      <input
                        type="checkbox"
                        checked={cuisines.includes(cuisine)}
                        onChange={() => toggleFilter(cuisine, setCuisines)}
                      />
                      <span>{cuisine}</span>
                    </label>
                  ))
                ) : (
                  <p>
                    Cuisine filters will appear when restaurants are listed.
                  </p>
                )}
              </section>
              <section className="restaurant-filter-group">
                <h3>Location</h3>
                {locationOptions.map((location) => (
                  <label key={location}>
                    <input
                      type="checkbox"
                      checked={locations.includes(location)}
                      onChange={() => toggleFilter(location, setLocations)}
                    />
                    <MapPin size={14} aria-hidden="true" />
                    <span>{location}</span>
                  </label>
                ))}
              </section>
            </div>
          </aside>

          <section className="restaurant-listing-results" aria-busy={loading}>
            <div className="restaurant-listing-toolbar">
              <h2 role="status" aria-live="polite">
                {loading
                  ? "Finding restaurants…"
                  : `${totalRestaurants} restaurant${totalRestaurants === 1 ? "" : "s"} found`}
              </h2>
              <label>
                Sort by:
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Recently added</option>
                  <option value="name">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="distance" disabled={!customerLocation}>
                    Nearest to me
                  </option>
                </select>
              </label>
            </div>
            {(query || cuisines.length > 0 || locations.length > 0) && (
              <div className="ux-filter-chips" aria-label="Active filters">
                {query && <button type="button" onClick={() => { setQuery(""); setSearchTerm(""); updateSearchUrl(""); setPage(1); }} aria-label={`Remove search ${query}`}>Search: {query} ×</button>}
                {cuisines.map((value) => <button type="button" key={`c-${value}`} onClick={() => toggleFilter(value, setCuisines)} aria-label={`Remove cuisine filter ${value}`}>{value} ×</button>)}
                {locations.map((value) => <button type="button" key={`l-${value}`} onClick={() => toggleFilter(value, setLocations)} aria-label={`Remove location filter ${value}`}>{value} ×</button>)}
              </div>
            )}
            {error ? (
              <div className="empty-state" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="restaurant-grid ux-restaurant-skeletons" aria-label="Loading restaurants">
                {Array.from({ length: PAGE_SIZE }, (_, index) => <div className="ux-skeleton-card" key={index} aria-hidden="true"><div /><span /><span /></div>)}
              </div>
            ) : visibleRestaurants.length ? (
              <div className="restaurant-grid">
                {visibleRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    guests={guestCount}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No matching restaurants</h3>
                <p>{sort === "distance"
                  ? "No restaurants with a saved map location match your nearby search yet. Try another area or clear your filters."
                  : totalRestaurants
                    ? "No restaurants match these filters. Try changing or clearing your filters."
                    : query || cuisines.length || locations.length
                      ? "Try a broader search or remove a filter to see more restaurants."
                      : "No restaurants are available yet. Check back soon."}</p>
                {(query || cuisines.length > 0 || locations.length > 0 || sort === "distance") && <button type="button" onClick={clearFilters}>Clear search and filters</button>}
              </div>
            )}
            {!loading && !error && totalRestaurants > 0 && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={totalRestaurants}
                onPageChange={setPage}
                label="restaurants"
                className="restaurant-pagination"
                showPageNumbers
              />
            )}
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
