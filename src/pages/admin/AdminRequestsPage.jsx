import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserCheck,
  Users,
  WalletCards,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

import { requestJson } from "../../lib/authApi.js";
import AdminActionConfirmModal from "../../components/admin/AdminActionConfirmModal.jsx";
import Pagination from "../../components/Pagination.jsx";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  { label: "Restaurants", icon: Store, path: "/admin/restaurants" },
  { label: "Users", icon: Users },
  { label: "Payments", icon: WalletCards },
  { label: "Offers", icon: ShieldCheck },
  { label: "Reviews & Reports", icon: FileText },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Notifications", icon: Bell },
  { label: "Activity Logs", icon: Activity },
  { label: "Settings", icon: Settings },
  {
    label: "Requests",
    icon: SlidersHorizontal,
    path: "/admin/requests",
    active: true,
  },
  { label: "Profile", icon: Users },
];

const requestStatuses = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function AdminRequestsPage() {
  const navigate = useNavigate();

  const [managerRequests, setManagerRequests] = useState([]);
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
    setLoading(true);
    setError("");

    try {
      const data = await requestJson("/api/admin/managers/requests", {
        method: "GET",
        fallbackMessage: "Unable to load manager requests.",
      });

      setManagerRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load manager requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadManagerRequests();
  }, []);

  async function handleApprove(managerId) {
    setProcessingId(managerId);
    setError("");

    try {
      await requestJson(`/api/admin/managers/${managerId}/approve`, {
        method: "PATCH",
        fallbackMessage: "Unable to approve manager.",
      });

      setManagerRequests((current) => current.map((manager) => manager.id === managerId
        ? { ...manager, status: "ACTIVE", restaurant: { ...manager.restaurant, status: "APPROVED" } }
        : manager));
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

      setManagerRequests((current) => current.map((manager) => manager.id === managerId
        ? { ...manager, status: "REJECTED", restaurant: { ...manager.restaurant, status: "REJECTED" } }
        : manager));
      setConfirmation(null);
    } catch (err) {
      setError(err.message || "Unable to reject manager.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleLogout() {
    try {
      await requestJson("/api/auth/admin/logout", {
        method: "POST",
        fallbackMessage: "Unable to sign out.",
      });
    } finally {
      navigate("/admin/login", { replace: true });
    }
  }

  const statusCounts = {
    ALL: managerRequests.length,
    PENDING: managerRequests.filter((manager) => (manager.restaurant?.status || manager.status) === "PENDING").length,
    APPROVED: managerRequests.filter((manager) => (manager.restaurant?.status || manager.status) === "APPROVED").length,
    REJECTED: managerRequests.filter((manager) => (manager.restaurant?.status || manager.status) === "REJECTED").length,
  };
  const filteredRequests = managerRequests.filter((manager) => {
    const status = manager.restaurant?.status || manager.status;
    const haystack = `${manager.id} ${manager.name || ""} ${manager.email || ""} ${manager.restaurant?.name || ""} ${manager.restaurant?.city || ""} ${manager.restaurant?.cuisine_type || ""}`.toLowerCase();
    return (activeStatus === "ALL" || status === activeStatus) && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }).sort((left, right) => {
    const createdDelta = (Date.parse(left.created_at || 0) || 0) - (Date.parse(right.created_at || 0) || 0);
    return sort === "oldest" ? createdDelta : -createdDelta;
  });
  const visibleRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  useEffect(() => { setPage(1); }, [activeStatus, query, sort, pageSize]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark">
            <UtensilsIcon />
          </div>

          <div>
            <strong>DineBook</strong>
            <span>PLATFORM ADMIN</span>
          </div>
        </div>

        <nav className="admin-nav">
          {navigation.map(({ label, icon: Icon, active, path }) => (
            <button
              key={label}
              type="button"
              className={`admin-nav-item ${active ? "active" : ""}`}
              onClick={() => path && navigate(path)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="admin-sidebar-user">
          <div className="admin-avatar">MC</div>

          <div>
            <strong>Maya Chen</strong>
            <span>Super Admin</span>
          </div>
        </div>
      </aside>

      <section className="admin-dashboard-main">
        <header className="admin-topbar">
          <h1>Requests</h1>

          <div className="admin-topbar-actions">
            <div className="admin-search">
              <MapPin size={15} />
              <input
                type="search"
                placeholder="Search platform..."
                aria-label="Search platform"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="admin-notification-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <div className="admin-dashboard-content">
          <PortalBreadcrumb home={{ label: "Admin", to: "/admin/dashboard" }} items={[{ label: "Requests" }]} className="admin-breadcrumb" />
          <div className="admin-dashboard-heading">
            <div>
              <h2>Manager Requests</h2>
              <p>
                Review manager applications and track their current status.
              </p>
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

          <div className="admin-request-status-tabs" role="group" aria-label="Filter manager requests by status">
            {requestStatuses.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={activeStatus === status}
                className={`admin-request-status-tab ${activeStatus === status ? "active" : ""}`}
                onClick={() => setActiveStatus(status)}
              >
                {status === "ALL" ? "All Requests" : status.charAt(0) + status.slice(1).toLowerCase()}
                <span>{statusCounts[status]}</span>
              </button>
            ))}
          </div>

          <div className="admin-page-actions">
            <div className="admin-search"><Search size={15} /><input type="search" placeholder="Search manager, restaurant, or location" aria-label="Search manager requests" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <label className="admin-filter-select">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            <button type="button" className="admin-refresh-button" onClick={() => { setQuery(""); setActiveStatus("ALL"); setSort("newest"); }}>Clear filters</button>
          </div>

          {error && <div className="admin-request-error">{error}</div>}

          {loading ? (
            <div className="admin-request-empty">
              Loading manager requests...
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="admin-request-empty">
              <UserCheck size={28} />
              <strong>{managerRequests.length === 0 ? "No manager applications" : "No requests match these filters"}</strong>
              <span>{managerRequests.length === 0 ? "New restaurant applications will appear here." : "Try another status or search term."}</span>
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
                      <span className={`admin-request-status ${(manager.restaurant?.status || manager.status || "pending").toLowerCase()}`}>
                        {manager.restaurant?.status || manager.status}
                      </span>
                    </div>

                    <p>{manager.restaurant?.cuisine_type || "Restaurant application"} · {manager.restaurant?.city || "Location not provided"}</p>
                    <small>Manager: {manager.name} · {manager.email}</small>

                    <small>
                      Registered{" "}
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleString()
                        : "recently"}
                    </small>
                  </div>

                  {(manager.restaurant?.status || manager.status) === "PENDING" && <div className="admin-request-actions">
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
                  </div>}
                </article>
              ))}
            </div>
          )}
          {!loading && filteredRequests.length > 0 && <Pagination page={page} pageSize={pageSize} total={filteredRequests.length} onPageChange={setPage} onPageSizeChange={setPageSize} label="requests" />}
        </div>
      </section>
      <AdminActionConfirmModal
        action={confirmation?.action}
        subject={confirmation?.manager?.restaurant?.name || confirmation?.manager?.name || "this manager application"}
        busy={confirmation && processingId === confirmation.manager.id}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation?.action === "approve"
          ? handleApprove(confirmation.manager.id)
          : handleReject(confirmation.manager.id)}
      />
    </main>
  );
}

function UtensilsIcon() {
  return (
    <span className="admin-utensils-icon">
      <span />
      <span />
      <span />
    </span>
  );
}
