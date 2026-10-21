import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PortalBreadcrumb from "../PortalBreadcrumb.jsx";
import AdminPrimaryNav from "./AdminPrimaryNav.jsx";
import { requestJson } from "../../lib/authApi.js";
import { LogOut, Menu, X } from "lucide-react";
import NotificationBell from "../notifications/NotificationBell.jsx";

export default function AdminLayout({
  children,
  title = "Dashboard",
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <main className="admin-dashboard db-portal-shell">
      {sidebarOpen && <button className="admin-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark">
            <UtensilsIcon />
          </div>

          <div>
            <strong>DineBook</strong>
            <span>PLATFORM ADMIN</span>
          </div>
        </div>

        <div id="admin-primary-nav">
          <AdminPrimaryNav onNavigate={() => setSidebarOpen(false)} />
          <button
            type="button"
            className="admin-nav-item"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <div className="admin-sidebar-user">
          <div className="admin-avatar">MC</div>

          <div>
            <strong>Maya Chen</strong>
            <span>Super Admin</span>
          </div>
        </div>
      </aside>

      <section className="admin-dashboard-main db-portal-main">
        <header className="admin-topbar db-portal-topbar">
          <button className="admin-mobile-nav-toggle" type="button" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-expanded={sidebarOpen} aria-controls="admin-primary-nav" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1>{title}</h1>

          <div className="admin-topbar-actions">
            <NotificationBell role="admin" />
          </div>
        </header>

        <PortalBreadcrumb home={{ label: "Admin", to: "/admin/dashboard" }} items={pathname.startsWith("/admin/requests/") ? [{ label: "Requests", to: "/admin/requests" }, { label: title }] : pathname.startsWith("/admin/restaurants/") ? [{ label: "Restaurants", to: "/admin/restaurants" }, { label: title }] : [{ label: title }]} className="admin-breadcrumb" />
        {children}
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
