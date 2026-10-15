import { useEffect, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import Pagination from "../../components/Pagination.jsx";
import RestaurantCard from "../../components/landing/RestaurantCard.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";

const PAGE_SIZE = 6;

export default function CustomerRestaurantListingPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [cuisines, setCuisines] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [guestCount, setGuestCount] = useState("4");
  const [toast, setToast] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), sort });
    if (query.trim()) params.set("search", query.trim());
    cuisines.forEach((value) => params.append("cuisine", value));
    locations.forEach((value) => params.append("location", value));
    setLoading(true);
    setError("");
    const request = sort === "distance" && customerLocation
      ? requestJson("/api/customer/restaurants/nearby", {
          method: "POST",
          body: JSON.stringify({
            latitude: customerLocation.latitude,
            longitude: customerLocation.longitude,
            search: query.trim() || null,
            cuisine: cuisines,
            location: locations,
            page,
            page_size: PAGE_SIZE,
          }),
        })
      : requestJson(`/api/customer/restaurants?${params.toString()}`);
    request
      .then((data) => {
        if (!mounted) return;
        setRestaurants(Array.isArray(data?.items) ? data.items : []);
        setTotalRestaurants(Number(data?.total) || 0);
        setCuisineOptions(Array.isArray(data?.cuisines) ? data.cuisines : []);
        setLocationOptions(Array.isArray(data?.locations) ? data.locations : []);
      })
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [page, query, cuisines, locations, sort, customerLocation]);

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

  const visibleRestaurants = restaurants;

  function toggleFilter(value, setter) {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
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
        setCustomerLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setSort("distance");
        setPage(1);
        setLocationBusy(false);
      },
      (reason) => {
        setLocationBusy(false);
        setLocationError(reason.code === 1
          ? "Allow location access to see nearby restaurants."
          : "Could not get your location. Please try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  function notifyReservation(restaurant) {
    setToast(`Table reservations for ${guestCount} guests at ${restaurant.name} are coming soon.`);
    window.setTimeout(() => setToast(""), 3600);
  }

  return (
    <div className="customer-home">
      <CustomerHeader user={user} onLogout={() => setUser(null)} />
      <section className="restaurant-listing-search">
        <div className="restaurant-listing-search-inner">
          <h1>Find your perfect table{restaurants[0]?.location ? ` in ${restaurants[0].location.split(",")[0]}` : ""}</h1>
          <div className="restaurant-search-bar">
            <Search size={18} />
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search restaurants, cuisines, or locations…" aria-label="Search restaurants" />
            <label className="restaurant-guest-select"><Users size={17} /><select value={guestCount} onChange={(event) => setGuestCount(event.target.value)} aria-label="Guests">{[2, 4, 6, 8].map((count) => <option key={count} value={count}>{count} Guests</option>)}</select></label>
            <button type="button" onClick={() => setPage(1)}>Search</button>
          </div>
          <div className="restaurant-nearby-controls">
            <button type="button" onClick={findNearbyRestaurants} disabled={locationBusy}>
              <MapPin size={15} />{locationBusy ? "Finding location…" : sort === "distance" ? "Refresh nearby results" : "Find restaurants near me"}
            </button>
            {locationError && <span role="alert">{locationError}</span>}
          </div>
        </div>
      </section>

      <main className="restaurant-listing-page">
        <nav className="restaurant-listing-breadcrumb" aria-label="Breadcrumb"><Link to="/customer">Home</Link><span aria-hidden="true">/</span><strong aria-current="page">Restaurants</strong></nav>
        <div className="restaurant-listing-layout">
          <aside className="restaurant-filter-panel">
            <div className="restaurant-filter-title"><h2>Filters</h2><button type="button" onClick={clearFilters}>Clear All</button></div>
            <section className="restaurant-filter-group"><h3>Cuisine</h3>{cuisineOptions.length ? cuisineOptions.map((cuisine) => <label key={cuisine}><input type="checkbox" checked={cuisines.includes(cuisine)} onChange={() => toggleFilter(cuisine, setCuisines)} />{cuisine}</label>) : <p>Cuisine filters will appear when restaurants are listed.</p>}</section>
            <section className="restaurant-filter-group"><h3>Location</h3>{locationOptions.map((location) => <label key={location}><input type="checkbox" checked={locations.includes(location)} onChange={() => toggleFilter(location, setLocations)} /><MapPin size={13} />{location}</label>)}</section>
          </aside>

          <section className="restaurant-listing-results" aria-live="polite">
            <div className="restaurant-listing-toolbar"><h2>{loading ? "Loading restaurants…" : `Showing ${totalRestaurants} restaurant${totalRestaurants === 1 ? "" : "s"}`}</h2><label>Sort by:<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Recently added</option><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="distance" disabled={!customerLocation}>Nearest to me</option></select></label></div>
            {error ? <div className="empty-state" role="alert">{error}</div> : loading ? <div className="empty-state" role="status">Loading approved restaurants…</div> : visibleRestaurants.length ? <div className="restaurant-grid">{visibleRestaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} onReserve={notifyReservation} />)}</div> : <div className="empty-state">{sort === "distance" ? "No restaurants with a saved map location match your nearby search yet." : totalRestaurants ? "No restaurants match these filters." : "No approved restaurants are available yet."}</div>}
            {!loading && !error && totalRestaurants > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={totalRestaurants} onPageChange={setPage} label="restaurants" className="restaurant-pagination" showPageNumbers />}
          </section>
        </div>
      </main>
      <LandingFooter />
      {toast && <div className="landing-toast" role="status">{toast}</div>}
    </div>
  );
}
