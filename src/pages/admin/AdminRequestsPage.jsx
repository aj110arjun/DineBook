import { formatLocalDateTime } from "../../lib/localDate.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCheck, Check, X, RefreshCw } from "lucide-react";

import { requestJson } from "../../lib/authApi.js";
import AdminActionConfirmModal from "../../components/admin/AdminActionConfirmModal.jsx";
import Pagination from "../../components/Pagination.jsx";
import AdminLayout from "../../components/admin/AdminLayout.jsx";

const requestStatuses = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function AdminRequestsPage() {
  const navigate = useNavigate();

  const [managerRequests, setManagerRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadManagerRequests() {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page, page_size: pageSize, search: query, status: activeStatus, sort });
      const data = await requestJson(`/api/admin/managers/requests?${params}`, {
        method: "GET",
        fallbackMessage: "Unable to load manager requests.",
      });

      if (sequence !== requestSequence.current) return;
      setManagerRequests(data.items);
      setTotal(data.total);
      setStatusCounts(data.status_counts);
    } catch (err) {
      if (sequence === requestSequence.current) setError(err.message || "Unable to load manager requests.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadManagerRequests();
    return () => { requestSequence.current += 1; };
  }, [page, pageSize, query, activeStatus, sort]);

  async function handleApprove(managerId) {
    setProcessingId(managerId);
    setError("");

    try {
      await requestJson(`/api/admin/managers/${managerId}/approve`, {
        method: "PATCH",
        fallbackMessage: "Unable to approve manager.",
      });

      await loadManagerRequests();
      setConfirmation(null);
    } catch (err) {
      setError(err.message || "Unable to approve manager.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(managerId) {
    setProcessingId(managerId);
    setError("");

    try {
      await requestJson(`/api/admin/managers/${managerId}/reject`, {
        method: "PATCH",
        fallbackMessage: "Unable to reject manager.",
      });

      await loadManagerRequests();
      setConfirmation(null);
    } catch (err) {
      setError(err.message || "Unable to reject manager.");
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
      <div className="admin-dashboard-content">
        <div className="admin-dashboard-heading">
          <div>
            <h2>Manager Requests</h2>
            <p>Review manager applications and track their current status.</p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadManagerRequests}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

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
              className={`admin-request-status-tab ${activeStatus === status ? "active" : ""}`}
              onClick={() => setActiveStatus(status)}
            >
              {status === "ALL"
                ? "All Requests"
                : status.charAt(0) + status.slice(1).toLowerCase()}
              <span>{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        <div className="admin-page-actions">
          <div className="admin-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search manager, restaurant, or location"
              aria-label="Search manager requests"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <label className="admin-filter-select">
            Sort{" "}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
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
            }}
          >
            Clear filters
          </button>
        </div>

        {error && <div className="admin-request-error">{error}</div>}

        {loading ? (
          <div className="admin-request-empty">Loading manager requests...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="admin-request-empty">
            <UserCheck size={28} />
            <strong>
              {managerRequests.length === 0
                ? "No manager applications"
                : "No requests match these filters"}
            </strong>
            <span>
              {managerRequests.length === 0
                ? "New restaurant applications will appear here."
                : "Try another status or search term."}
            </span>
          </div>
        ) : (
          <div className="admin-request-list">
            {visibleRequests.map((manager) => (
              <article
                key={manager.id}
                className="admin-request-card cursor-pointer"
                onClick={() => navigate(`/admin/requests/${manager.id}`)}
              >
                <div className="admin-request-avatar">
                  {manager.name?.charAt(0)?.toUpperCase() || "M"}
                </div>

                <div className="admin-request-details">
                  <div className="admin-request-title">
                    <h3>{manager.restaurant?.name || manager.name}</h3>
                    <span
                      className={`admin-request-status ${(manager.restaurant?.status || manager.status || "pending").toLowerCase()}`}
                    >
                      {manager.restaurant?.status || manager.status}
                    </span>
                  </div>

                  <p>
                    {manager.restaurant?.cuisine_type ||
                      "Restaurant application"}{" "}
                    · {manager.restaurant?.city || "Location not provided"}
                  </p>
                  <small>
                    Manager: {manager.name} · {manager.email}
                  </small>

                  <small>
                    Registered{" "}
                    {manager.created_at
                      ? formatLocalDateTime(manager.created_at, { timeStyle: "medium" })
                      : "recently"}
                  </small>
                </div>

                {(manager.restaurant?.status || manager.status) ===
                  "PENDING" && (
                  <div className="admin-request-actions">
                    <button
                      type="button"
                      className="admin-request-reject"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmation({ manager, action: "reject" });
                      }}
                      disabled={processingId === manager.id}
                    >
                      <X size={15} />
                      Reject
                    </button>

                    <button
                      type="button"
                      className="admin-request-approve"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmation({ manager, action: "approve" });
                      }}
                      disabled={processingId === manager.id}
                    >
                      <Check size={15} />
                      Approve
                    </button>
                  </div>
                )}
              </article>
            ))}
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
