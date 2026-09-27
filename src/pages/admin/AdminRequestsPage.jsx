import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
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

export default function AdminRequestsPage() {
  const navigate = useNavigate();

  const [managerRequests, setManagerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

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

      setManagerRequests((current) =>
        current.filter((manager) => manager.id !== managerId),
      );
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

      setManagerRequests((current) =>
        current.filter((manager) => manager.id !== managerId),
      );
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
          <div className="admin-dashboard-heading">
            <div>
              <h2>Manager Requests</h2>
              <p>
                Review restaurant manager registration requests waiting for
                approval.
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

          {error && <div className="admin-request-error">{error}</div>}

          {loading ? (
            <div className="admin-request-empty">
              Loading manager requests...
            </div>
          ) : managerRequests.length === 0 ? (
            <div className="admin-request-empty">
              <UserCheck size={28} />
              <strong>No pending manager requests</strong>
              <span>New manager registrations will appear here.</span>
            </div>
          ) : (
            <div className="admin-request-list">
              {managerRequests.map((manager) => (
                <article key={manager.id} className="admin-request-card">
                  <div className="admin-request-avatar">
                    {manager.name?.charAt(0)?.toUpperCase() || "M"}
                  </div>

                  <div className="admin-request-details">
                    <div className="admin-request-title">
                      <h3>{manager.name}</h3>
                      <span className="admin-request-status">
                        {manager.status}
                      </span>
                    </div>

                    <p>{manager.email}</p>

                    <small>
                      Registered{" "}
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleString()
                        : "recently"}
                    </small>
                  </div>

                  <div className="admin-request-actions">
                    <button
                      type="button"
                      className="admin-request-reject"
                      onClick={() => handleReject(manager.id)}
                      disabled={processingId === manager.id}
                    >
                      <X size={15} />
                      Reject
                    </button>

                    <button
                      type="button"
                      className="admin-request-approve"
                      onClick={() => handleApprove(manager.id)}
                      disabled={processingId === manager.id}
                    >
                      <Check size={15} />
                      Approve
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
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
