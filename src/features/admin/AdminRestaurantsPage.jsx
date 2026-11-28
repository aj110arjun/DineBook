import useLoadingPhase from "../../hooks/useLoadingPhase.js";
import { RefreshIndicator } from "../../components/ui/LoadingState.jsx";
import { usePageState } from "../../state/usePageState.js";
import { formatLocalDateTime, formatTimeAgo } from "../../lib/localDate.js";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Eye,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import Pagination from "../../components/Pagination.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminRestaurantsPage() {
  const navigate = useNavigate();
  const [relativeNow, setRelativeNow] = useState(Date.now());
  const [
    {
      restaurants,
      total,
      cuisines,
      locations,
      query,
      cuisineFilter,
      locationFilter,
      statusFilter,
      sort,
      page,
      pageSize,
      loading,
      error,
      refresh,
    },
    {
      restaurants: setRestaurants,
      total: setTotal,
      cuisines: setCuisines,
      locations: setLocations,
      query: setQuery,
      cuisineFilter: setCuisineFilter,
      locationFilter: setLocationFilter,
      statusFilter: setStatusFilter,
      sort: setSort,
      page: setPage,
      pageSize: setPageSize,
      loading: setLoading,
      error: setError,
      refresh: setRefresh,
    },
  ] = usePageState("AdminRestaurantsPage", () => ({
    restaurants: [],
    total: 0,
    cuisines: [],
    locations: [],
    query: "",
    cuisineFilter: "",
    locationFilter: "",
    statusFilter: "",
    sort: "newest",
    page: 1,
    pageSize: 6,
    loading: true,
    error: "",
    refresh: 0,
  }));

  const { initialLoading, refreshing } = useLoadingPhase(
    loading,
    restaurants.length,
    error,
  );

  useEffect(() => {
    const timer = setInterval(() => setRelativeNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
      search: query,
      cuisine: cuisineFilter,
      location: locationFilter,
      status: statusFilter,
      sort,
    });
    requestJson(`/api/admin/restaurants?${params}`)
      .then((data) => {
        if (!mounted) return;
        setRestaurants(data.items);
        setTotal(data.total);
        setCuisines(data.cuisines);
        setLocations(data.locations);
      })
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [
    refresh,
    page,
    pageSize,
    query,
    cuisineFilter,
    locationFilter,
    statusFilter,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visibleRestaurants = restaurants;
  const hasActiveFilters = Boolean(
    query.trim() || cuisineFilter || locationFilter || statusFilter,
  );

  useEffect(() => {
    setPage(1);
  }, [query, cuisineFilter, locationFilter, statusFilter, sort, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <AdminLayout title="Restaurants" activePath="/admin/restaurants">
      <div className="admin-dashboard-content admin-restaurants-page">
        <div className="admin-page-heading">
          <div>
            <h2>Restaurant Management</h2>
            <p>Manage restaurant profiles, owner access, and visibility.</p>
          </div>
          <div className="admin-page-actions">
            <div className="admin-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search restaurants..."
                aria-label="Search restaurants"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className="admin-filter-select"
              aria-label="Filter by cuisine"
              value={cuisineFilter}
              onChange={(event) => setCuisineFilter(event.target.value)}
            >
              <option value="">All cuisines</option>
              {cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
            <select
              className="admin-filter-select"
              aria-label="Filter by location"
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <select
              className="admin-filter-select"
              aria-label="Filter by restaurant status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {[
                ...new Set(
                  restaurants
                    .map((restaurant) => restaurant.status?.toUpperCase())
                    .filter(Boolean),
                ),
              ]
                .sort()
                .map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
            </select>
            <select
              className="admin-filter-select"
              aria-label="Sort restaurants"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => {
                setQuery("");
                setCuisineFilter("");
                setLocationFilter("");
                setStatusFilter("");
                setSort("newest");
                setPage(1);
              }}
            >
              Clear filters
            </button>
            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => setRefresh((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="admin-request-error" role="alert">
            {error}
          </div>
        )}
        <RefreshIndicator active={refreshing} />
        {initialLoading ? (
          <div
            className="admin-restaurant-card-grid"
            role="status"
            aria-label="Loading restaurants"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="admin-restaurant-card-skeleton"
                key={index}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : visibleRestaurants.length ? (
          <div className="admin-restaurant-card-grid">
            {visibleRestaurants.map((restaurant) => {
              const restaurantName = restaurant.name || "Restaurant";
              const status = String(
                restaurant.status || "UNKNOWN",
              ).toUpperCase();
              const location = restaurant.location || "Not provided";
              const detailsPath = `/admin/restaurants/${restaurant.id}`;
              const registeredAt = restaurant.created_at
                ? formatLocalDateTime(restaurant.created_at, {
                    timeStyle: "medium",
                  })
                : "";

              return (
                <article
                  className={`admin-restaurant-card ${status.toLowerCase()}`}
                  key={restaurant.id}
                >
                  <div className="admin-restaurant-card-header">
                    <div className="admin-restaurant-identity">
                      <span
                        className="admin-restaurant-avatar"
                        aria-hidden="true"
                      >
                        {restaurantName.charAt(0).toUpperCase()}
                      </span>
                      <div className="admin-restaurant-title">
                        <span>Restaurant</span>
                        <h3 title={restaurantName}>{restaurantName}</h3>
                      </div>
                    </div>
                    <span
                      className={`restaurant-status ${status.toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="admin-restaurant-info">
                    <div className="admin-restaurant-info-item">
                      <span>
                        <Building2 size={13} /> Cuisine
                      </span>
                      <strong title={restaurant.cuisine_type || "Not provided"}>
                        {restaurant.cuisine_type || "Not provided"}
                      </strong>
                    </div>
                    <div className="admin-restaurant-info-item">
                      <span>
                        <MapPin size={13} /> Location
                      </span>
                      <strong title={location}>{location}</strong>
                    </div>
                    <div className="admin-restaurant-info-item owner">
                      <span>
                        <UserRound size={13} /> Owner
                      </span>
                      <strong
                        title={restaurant.manager?.name || "Not provided"}
                      >
                        {restaurant.manager?.name || "Not provided"}
                      </strong>
                      {restaurant.manager?.email ? (
                        <a
                          href={`mailto:${restaurant.manager.email}`}
                          title={restaurant.manager.email}
                        >
                          <Mail size={12} />
                          {restaurant.manager.email}
                        </a>
                      ) : (
                        <span className="admin-restaurant-email-missing">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-restaurant-card-footer">
                    <div className="admin-restaurant-registered">
                      <CalendarDays size={14} />
                      <span className="admin-restaurant-registered-copy">
                        <span>
                          Registered{" "}
                          <time
                            dateTime={restaurant.created_at || undefined}
                            title={registeredAt || undefined}
                          >
                            {formatTimeAgo(restaurant.created_at, {
                              now: relativeNow,
                            }) || "Time unavailable"}
                          </time>
                        </span>
                        {registeredAt && <small>{registeredAt}</small>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="admin-restaurant-view"
                      aria-label={`View ${restaurantName} details`}
                      onClick={() => navigate(detailsPath)}
                    >
                      <Eye size={14} />
                      View details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-restaurant-empty">
            <span className="admin-restaurant-empty-icon">
              {error ? <RefreshCw size={21} /> : <Store size={23} />}
            </span>
            <strong>
              {error
                ? "Unable to load restaurants"
                : hasActiveFilters
                  ? "No approved restaurants match these filters."
                  : "No approved restaurants are available yet."}
            </strong>
            <span>
              {error
                ? "Retry to load restaurant profiles."
                : hasActiveFilters
                  ? "Try another search or clear the selected filters."
                  : "Approved restaurant profiles will appear here."}
            </span>
            {error && (
              <button
                type="button"
                onClick={() => setRefresh((value) => value + 1)}
                disabled={loading}
              >
                Retry
              </button>
            )}
          </div>
        )}
        {!loading && restaurants.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            label="restaurants"
          />
        )}
      </div>
    </AdminLayout>
  );
}
