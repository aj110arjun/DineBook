import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminRestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    requestJson("/api/admin/restaurants")
      .then((data) => mounted && setRestaurants(
        Array.isArray(data)
          ? data.filter((restaurant) => restaurant.status?.toUpperCase() === "APPROVED")
          : [],
      ))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [refresh]);

  const cuisines = useMemo(() => [...new Set(restaurants.map((restaurant) => restaurant.cuisine_type).filter(Boolean))].sort(), [restaurants]);
  const locations = useMemo(() => [...new Set(restaurants.map((restaurant) => restaurant.location).filter(Boolean))].sort(), [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return restaurants.filter((restaurant) =>
      (!normalized || [restaurant.name, restaurant.cuisine_type, restaurant.location, restaurant.manager?.name, restaurant.manager?.email]
        .filter(Boolean).join(" ").toLowerCase().includes(normalized))
      && (!cuisineFilter || restaurant.cuisine_type === cuisineFilter)
      && (!locationFilter || restaurant.location === locationFilter),
    );
  }, [restaurants, query, cuisineFilter, locationFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const visibleRestaurants = filteredRestaurants.slice((page - 1) * pageSize, page * pageSize);
  const firstResult = filteredRestaurants.length ? (page - 1) * pageSize + 1 : 0;
  const lastResult = Math.min(page * pageSize, filteredRestaurants.length);

  useEffect(() => { setPage(1); }, [query, cuisineFilter, locationFilter, pageSize]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  return (
    <AdminLayout title="Restaurants" activePath="/admin/restaurants">
      <div className="admin-dashboard-content">
        <div className="admin-page-heading">
          <div>
            <h2>Restaurant Management</h2>
            <p>View approved restaurant profiles and their owners.</p>
          </div>
          <div className="admin-page-actions">
            <div className="admin-search">
              <Search size={15} />
              <input type="search" placeholder="Search restaurants..." aria-label="Search restaurants" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="admin-filter-select" aria-label="Filter by cuisine" value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)}>
              <option value="">All cuisines</option>
              {cuisines.map((cuisine) => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
            </select>
            <select className="admin-filter-select" aria-label="Filter by location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <option value="">All locations</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
            <button type="button" className="admin-refresh-button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="admin-request-error" role="alert">{error}</div>}
        <div className="admin-table-card">
          <table className="admin-table">
            <thead><tr><th>Restaurant</th><th>Location</th><th>Owner</th><th>Status</th><th>Registered</th><th /></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="admin-table-empty">Loading restaurants…</td></tr>
              ) : visibleRestaurants.length ? visibleRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="admin-restaurant-row" onClick={() => navigate(`/admin/restaurants/${restaurant.id}`)}>
                  <td><strong>{restaurant.name}</strong><small>{restaurant.cuisine_type || "Cuisine not provided"}</small></td>
                  <td>{restaurant.location || "—"}</td>
                  <td><strong>{restaurant.manager?.name || "—"}</strong><small>{restaurant.manager?.email || ""}</small></td>
                  <td><span className={`restaurant-status ${restaurant.status?.toLowerCase()}`}>{restaurant.status}</span></td>
                  <td>{restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString() : "—"}</td>
                  <td><button type="button" className="admin-table-action" aria-label={`View ${restaurant.name} details`} onClick={(event) => { event.stopPropagation(); navigate(`/admin/restaurants/${restaurant.id}`); }}><Eye size={16} /></button></td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="admin-table-empty">{restaurants.length === 0 ? "No approved restaurants are available yet." : "No approved restaurants match these filters."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && restaurants.length > 0 && <div className="admin-pagination">
          <span className="admin-pagination-summary">Showing <strong>{firstResult}–{lastResult}</strong> of <strong>{filteredRestaurants.length}</strong> restaurants</span>
          <div className="admin-pagination-controls">
            <label htmlFor="restaurant-page-size">Rows</label>
            <select id="restaurant-page-size" className="admin-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Previous</button>
            <span className="admin-pagination-page">Page {page} of {pageCount}</span>
            <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={16} /></button>
          </div>
        </div>}
      </div>
    </AdminLayout>
  );
}
