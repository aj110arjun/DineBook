import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminRestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
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
          ? data.filter((restaurant) => ["APPROVED", "SUSPENDED"].includes(restaurant.status?.toUpperCase()))
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
      && (!locationFilter || restaurant.location === locationFilter)
      && (!statusFilter || restaurant.status?.toUpperCase() === statusFilter),
    ).sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "oldest") return (Date.parse(left.created_at || 0) || 0) - (Date.parse(right.created_at || 0) || 0);
      return (Date.parse(right.created_at || 0) || 0) - (Date.parse(left.created_at || 0) || 0);
    });
  }, [restaurants, query, cuisineFilter, locationFilter, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const visibleRestaurants = filteredRestaurants.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, cuisineFilter, locationFilter, statusFilter, sort, pageSize]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  return (
    <AdminLayout title="Restaurants" activePath="/admin/restaurants">
      <div className="admin-dashboard-content">
        <div className="admin-page-heading">
          <div>
            <h2>Restaurant Management</h2>
            <p>Manage restaurant profiles, owner access, and visibility.</p>
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
            <select className="admin-filter-select" aria-label="Filter by restaurant status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{[...new Set(restaurants.map((restaurant) => restaurant.status?.toUpperCase()).filter(Boolean))].sort().map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select className="admin-filter-select" aria-label="Sort restaurants" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select>
            <button type="button" className="admin-refresh-button" onClick={() => { setQuery(""); setCuisineFilter(""); setLocationFilter(""); setStatusFilter(""); setSort("newest"); setPage(1); }}>Clear filters</button>
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
        {!loading && restaurants.length > 0 && <Pagination page={page} pageSize={pageSize} total={filteredRestaurants.length} onPageChange={setPage} onPageSizeChange={setPageSize} label="restaurants" />}
      </div>
    </AdminLayout>
  );
}
