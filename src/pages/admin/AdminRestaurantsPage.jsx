import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminRestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    requestJson("/api/admin/restaurants")
      .then((data) => mounted && setRestaurants(Array.isArray(data) ? data : []))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [refresh]);

  const filteredRestaurants = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return restaurants;
    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.cuisine_type, restaurant.location, restaurant.manager?.name, restaurant.manager?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [restaurants, query]);

  return (
    <AdminLayout title="Restaurants" activePath="/admin/restaurants">
      <div className="admin-dashboard-content">
        <div className="admin-page-heading">
          <div>
            <h2>Restaurant Management</h2>
            <p>View restaurant profiles, owners, and application status.</p>
          </div>
          <div className="admin-page-actions">
            <div className="admin-search">
              <Search size={15} />
              <input type="search" placeholder="Search restaurants..." aria-label="Search restaurants" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
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
              ) : filteredRestaurants.length ? filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="admin-restaurant-row" onClick={() => navigate(`/admin/restaurants/${restaurant.id}`)}>
                  <td><strong>{restaurant.name}</strong><small>{restaurant.cuisine_type || "Cuisine not provided"}</small></td>
                  <td>{restaurant.location || "—"}</td>
                  <td><strong>{restaurant.manager?.name || "—"}</strong><small>{restaurant.manager?.email || ""}</small></td>
                  <td><span className={`restaurant-status ${restaurant.status?.toLowerCase()}`}>{restaurant.status}</span></td>
                  <td>{restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString() : "—"}</td>
                  <td><button type="button" className="admin-table-action" aria-label={`View ${restaurant.name} details`} onClick={(event) => { event.stopPropagation(); navigate(`/admin/restaurants/${restaurant.id}`); }}><Eye size={16} /></button></td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="admin-table-empty">{query ? "No restaurants match your search." : "No restaurants have been registered yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
