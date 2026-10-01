import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import RestaurantCard from "../../components/landing/RestaurantCard.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";

const PAGE_SIZE = 6;

export default function CustomerRestaurantListingPage() {
  const [restaurants, setRestaurants] = useState([]);
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

  useEffect(() => {
    let mounted = true;
    requestJson("/api/customer/restaurants")
      .then((data) => mounted && setRestaurants(Array.isArray(data) ? data : []))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

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

  const cuisineOptions = useMemo(() => [...new Set(restaurants.map((item) => item.cuisine).filter(Boolean))].sort(), [restaurants]);
  const locationOptions = useMemo(() => [...new Set(restaurants.map((item) => item.location).filter(Boolean))].sort(), [restaurants]);
  const filteredRestaurants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const results = restaurants.filter((restaurant) => {
      const matchesSearch = !normalized || `${restaurant.name} ${restaurant.cuisine} ${restaurant.location}`.toLowerCase().includes(normalized);
      const matchesCuisine = cuisines.length === 0 || cuisines.includes(restaurant.cuisine);
      const matchesLocation = locations.length === 0 || locations.includes(restaurant.location);
      return matchesSearch && matchesCuisine && matchesLocation;
    });
    return results.sort((left, right) => sort === "name" ? left.name.localeCompare(right.name) : new Date(right.created_at || 0) - new Date(left.created_at || 0));
  }, [restaurants, query, cuisines, locations, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRestaurants.length / PAGE_SIZE));
  const visibleRestaurants = filteredRestaurants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = filteredRestaurants.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, filteredRestaurants.length);
  const pageWindowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => pageWindowStart + index);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function toggleFilter(value, setter) {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setCuisines([]);
    setLocations([]);
    setSort("newest");
    setPage(1);
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
            <div className="restaurant-listing-toolbar"><h2>{loading ? "Loading restaurants…" : `Showing ${filteredRestaurants.length} restaurant${filteredRestaurants.length === 1 ? "" : "s"}`}</h2><label>Sort by:<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Recently added</option><option value="name">Name A–Z</option></select></label></div>
            {error ? <div className="empty-state" role="alert">{error}</div> : loading ? <div className="empty-state" role="status">Loading approved restaurants…</div> : visibleRestaurants.length ? <div className="restaurant-grid">{visibleRestaurants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} onReserve={notifyReservation} />)}</div> : <div className="empty-state">{restaurants.length ? "No restaurants match these filters." : "No approved restaurants are available yet."}</div>}
            {!loading && !error && filteredRestaurants.length > 0 && <nav className="restaurant-pagination" aria-label="Restaurant pages">
              <span className="restaurant-pagination-summary">Showing <strong>{firstResult}–{lastResult}</strong> of <strong>{filteredRestaurants.length}</strong></span>
              <div className="restaurant-pagination-pages">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
                {pageNumbers.map((number) => <button type="button" key={number} className={page === number ? "selected" : ""} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
                <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button>
              </div>
            </nav>}
          </section>
        </div>
      </main>
      <LandingFooter />
      {toast && <div className="landing-toast" role="status">{toast}</div>}
    </div>
  );
}
