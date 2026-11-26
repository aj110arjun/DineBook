import useLoadingPhase from "../../hooks/useLoadingPhase.js";
import { RefreshIndicator } from "../../components/ui/LoadingState.jsx";
import { usePageState } from "../../state/usePageState.js";
import { formatLocalDateTime, formatTimeAgo } from "../../lib/localDate.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Store,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { requestJson } from "../../lib/authApi.js";
import AdminActionConfirmModal from "../../components/admin/AdminActionConfirmModal.jsx";
import Pagination from "../../components/Pagination.jsx";
import AdminLayout from "../../components/admin/AdminLayout.jsx";

const requestStatuses = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function AdminRequestsPage() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState("");
  const [relativeNow, setRelativeNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRelativeNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const [
    { managerRequests, total, statusCounts },
    {
      managerRequests: setManagerRequests,
      total: setTotal,
      statusCounts: setStatusCounts,
    },
  ] = usePageState("AdminRequestsPage", () => ({
    managerRequests: [],
    total: 0,
    statusCounts: {},
  }));
  const requestSequence = useRef(0);
  const [
    {
      loading,
      processingId,
      confirmation,
      activeStatus,
      error,
      query,
      sort,
      page,
      pageSize,
    },
    {
      loading: setLoading,
      processingId: setProcessingId,
      confirmation: setConfirmation,
      activeStatus: setActiveStatus,
      error: setError,
      query: setQuery,
      sort: setSort,
      page: setPage,
      pageSize: setPageSize,
    },
  ] = usePageState("AdminRequestsPage", () => ({
    loading: true,
    processingId: null,
    confirmation: null,
    activeStatus: "ALL",
    error: "",
    query: "",
    sort: "newest",
    page: 1,
    pageSize: 6,
  }));

  async function loadManagerRequests() {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page,
        page_size: pageSize,
        search: query,
        status: activeStatus,
        sort,
      });
      const data = await requestJson(`/api/admin/managers/requests?${params}`, {
        method: "GET",
        fallbackMessage: "Unable to load manager requests.",
      });

      if (sequence !== requestSequence.current) return;
      setManagerRequests(data.items);
      setTotal(data.total);
      setStatusCounts(data.status_counts);
      return true;
    } catch (err) {
      if (sequence === requestSequence.current) {
        setError(err.message || "Unable to load manager requests.");
      }
      return false;
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  const { initialLoading, refreshing } = useLoadingPhase(
    loading,
    managerRequests.length,
    error,
  );

  useEffect(() => {
    loadManagerRequests();
    return () => {
      requestSequence.current += 1;
    };
  }, [page, pageSize, query, activeStatus, sort]);

  async function handleApprove(managerId) {
    setProcessingId(managerId);
    setError("");
    setSuccess("");

    try {
      await requestJson(`/api/admin/managers/${managerId}/approve`, {
        method: "PATCH",
        fallbackMessage: "Unable to approve manager.",
      });

      const refreshed = await loadManagerRequests();
      if (refreshed) setSuccess("The restaurant request was approved.");
      setConfirmation(null);
    } catch (err) {
      setError(err.message || "Unable to approve manager.");
      throw err;
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(managerId) {
    setProcessingId(managerId);
    setError("");
    setSuccess("");

    try {
      await requestJson(`/api/admin/managers/${managerId}/reject`, {
        method: "PATCH",
        fallbackMessage: "Unable to reject manager.",
      });

      const refreshed = await loadManagerRequests();
      if (refreshed) setSuccess("The restaurant request was rejected.");
      setConfirmation(null);
    } catch (err) {
      setError(err.message || "Unable to reject manager.");
      throw err;
    } finally {
      setProcessingId(null);
    }
  }

  const visibleRequests = managerRequests;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    setPage(1);
  }, [activeStatus, query, sort, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <AdminLayout title="Restaurant Requests">
      <div className="admin-dashboard-content admin-requests-page">
        <header className="admin-requests-heading">
          <div>
            <span className="admin-requests-eyebrow">APPLICATIONS</span>
            <h2>Restaurant Requests</h2>
            <p>
              Review restaurant registrations, evaluate manager applications,
              and manage approval statuses.
            </p>
          </div>

          <button
            type="button"
            className="admin-requests-refresh"
            onClick={loadManagerRequests}
            disabled={loading}
          >
            <RefreshCw size={15} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <section className="admin-request-summary" aria-label="Request summary">
          <div className="admin-request-stat total">
            <span className="admin-request-stat-icon">
              <Users size={17} />
            </span>
            <div>
              <span>Total requests</span>
              <strong>{statusCounts.ALL ?? total}</strong>
            </div>
          </div>
          <div className="admin-request-stat pending">
            <span className="admin-request-stat-icon">
              <Clock3 size={17} />
            </span>
            <div>
              <span>Pending</span>
              <strong>{statusCounts.PENDING ?? 0}</strong>
            </div>
          </div>
          <div className="admin-request-stat approved">
            <span className="admin-request-stat-icon">
              <Check size={17} />
            </span>
            <div>
              <span>Approved</span>
              <strong>{statusCounts.APPROVED ?? 0}</strong>
            </div>
          </div>
          <div className="admin-request-stat rejected">
            <span className="admin-request-stat-icon">
              <X size={17} />
            </span>
            <div>
              <span>Rejected</span>
              <strong>{statusCounts.REJECTED ?? 0}</strong>
            </div>
          </div>
        </section>

        <div
          className="admin-request-status-tabs"
          role="group"
          aria-label="Filter manager requests by status"
        >
          {requestStatuses.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={activeStatus === status}
              className={`admin-request-status-tab ${status.toLowerCase()} ${activeStatus === status ? "active" : ""}`}
              onClick={() => {
                setSuccess("");
                setPage(1);
                setActiveStatus(status);
              }}
            >
              {status === "ALL"
                ? "All Requests"
                : status.charAt(0) + status.slice(1).toLowerCase()}
              <span>{statusCounts[status] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="admin-page-actions">
          <div className="admin-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search restaurant, manager, email or location"
              aria-label="Search restaurant name, manager, email or location"
              value={query}
              onChange={(event) => {
                setSuccess("");
                setQuery(event.target.value);
              }}
            />
          </div>
          <label className="admin-filter-select">
            Sort{" "}
            <select
              value={sort}
              onChange={(event) => {
                setSuccess("");
                setSort(event.target.value);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <button
            type="button"
            className="admin-refresh-button"
            onClick={() => {
              setQuery("");
              setActiveStatus("ALL");
              setSort("newest");
              setPage(1);
              setSuccess("");
            }}
          >
            Clear filters
          </button>
        </div>

        {error && (
          <div className="admin-requests-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadManagerRequests}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}
        {success && (
          <p className="admin-requests-success" role="status">
            {success}
          </p>
        )}

        {refreshing && <RefreshIndicator active />}
        {initialLoading ? (
          <div
            className="admin-request-list"
            role="status"
            aria-label="Loading restaurant requests"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="admin-request-skeleton"
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
        ) : error && managerRequests.length === 0 ? (
          <div className="admin-request-empty admin-request-empty-error">
            <span className="admin-request-empty-icon">
              <RefreshCw size={21} />
            </span>
            <strong>Unable to load restaurant requests</strong>
            <span>Retry the request to load the latest applications.</span>
            <button
              type="button"
              onClick={loadManagerRequests}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="admin-request-empty">
            <span className="admin-request-empty-icon">
              <Store size={23} />
            </span>
            <strong>
              {(statusCounts.ALL ?? total) === 0
                ? "No restaurant requests yet"
                : "No requests match these filters"}
            </strong>
            <span>
              {(statusCounts.ALL ?? total) === 0
                ? "New restaurant registrations will appear here."
                : "Try another status or search term, or clear the filters."}
            </span>
          </div>
        ) : (
          <div className="admin-request-list">
            {visibleRequests.map((manager) => {
              const restaurantName =
                manager.restaurant?.name ||
                manager.name ||
                "Restaurant request";
              const status = String(
                manager.restaurant?.status || manager.status || "PENDING",
              ).toUpperCase();
              const location =
                [manager.restaurant?.city, manager.restaurant?.state]
                  .filter(Boolean)
                  .join(", ") || "Not provided";

              return (
                <article
                  key={manager.id}
                  className={`admin-request-card ${status.toLowerCase()}`}
                >
                  <div className="admin-request-card-header">
                    <div className="admin-request-identity">
                      <span className="admin-request-avatar" aria-hidden="true">
                        {restaurantName.charAt(0).toUpperCase()}
                      </span>
                      <div className="admin-request-title">
                        <span>Restaurant application</span>
                        <h3 title={restaurantName}>{restaurantName}</h3>
                      </div>
                    </div>
                    <span
                      className={`admin-request-status ${status.toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="admin-request-info">
                    <div className="admin-request-info-item">
                      <span>
                        <Building2 size={13} /> Cuisine
                      </span>
                      <strong
                        title={
                          manager.restaurant?.cuisine_type || "Not provided"
                        }
                      >
                        {manager.restaurant?.cuisine_type || "Not provided"}
                      </strong>
                    </div>
                    <div className="admin-request-info-item">
                      <span>
                        <MapPin size={13} /> Location
                      </span>
                      <strong title={location}>{location}</strong>
                    </div>
                    <div className="admin-request-info-item manager">
                      <span>
                        <UserRound size={13} /> Manager
                      </span>
                      <strong title={manager.name || "Not provided"}>
                        {manager.name || "Not provided"}
                      </strong>
                      {manager.email ? (
                        <a
                          href={`mailto:${manager.email}`}
                          title={manager.email}
                        >
                          <Mail size={12} />
                          {manager.email}
                        </a>
                      ) : (
                        <span className="admin-request-email-missing">
                          Not provided
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-request-card-footer">
                    <div className="admin-request-registered">
                      <CalendarDays size={14} />
                      <span className="admin-request-registered-copy">
                        <span>
                          Requested{" "}
                          <time
                            dateTime={manager.created_at || undefined}
                            title={
                              manager.created_at
                                ? formatLocalDateTime(manager.created_at, {
                                    timeStyle: "medium",
                                  })
                                : undefined
                            }
                          >
                            {formatTimeAgo(manager.created_at, {
                              now: relativeNow,
                            }) || "Time unavailable"}
                          </time>
                        </span>
                        {manager.created_at && (
                          <small>
                            {formatLocalDateTime(manager.created_at, {
                              timeStyle: "medium",
                            })}
                          </small>
                        )}
                      </span>
                    </div>
                    <div className="admin-request-actions">
                      <button
                        type="button"
                        className="admin-request-view"
                        onClick={() =>
                          navigate(`/admin/requests/${manager.id}`)
                        }
                        aria-label={`View details for ${restaurantName}`}
                      >
                        <Eye size={14} />
                        Details
                      </button>
                      {status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            className="admin-request-reject"
                            onClick={() =>
                              setConfirmation({ manager, action: "reject" })
                            }
                            disabled={Boolean(processingId)}
                            aria-label={`Reject ${restaurantName}`}
                          >
                            <X size={14} />
                            Reject
                          </button>
                          <button
                            type="button"
                            className="admin-request-approve"
                            onClick={() =>
                              setConfirmation({ manager, action: "approve" })
                            }
                            disabled={Boolean(processingId)}
                            aria-label={`Approve ${restaurantName}`}
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loading && total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            label="requests"
          />
        )}
      </div>
      <AdminActionConfirmModal
        action={confirmation?.action}
        subject={
          confirmation?.manager?.restaurant?.name ||
          confirmation?.manager?.name ||
          "this manager application"
        }
        busy={confirmation && processingId === confirmation.manager.id}
        onCancel={() => setConfirmation(null)}
        onConfirm={() =>
          confirmation?.action === "approve"
            ? handleApprove(confirmation.manager.id)
            : handleReject(confirmation.manager.id)
        }
      />
    </AdminLayout>
  );
}
