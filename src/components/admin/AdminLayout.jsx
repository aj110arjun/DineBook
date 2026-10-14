import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import PortalBreadcrumb from "../PortalBreadcrumb.jsx";
import { requestJson } from "../../lib/authApi.js";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    label: "Restaurants",
    icon: Store,
    path: "/admin/restaurants",
  },
  { label: "Users", icon: Users },
  { label: "Payments", icon: WalletCards },
  { label: "Offers", icon: ShieldCheck, path: "/admin/offers" },
  { label: "Reviews & Reports", icon: FileText, path: "/admin/reviews" },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Notifications", icon: Bell },
  { label: "Activity Logs", icon: Activity },
  { label: "Settings", icon: Settings },
  { label: "Requests", icon: SlidersHorizontal, path: "/admin/requests" },
  { label: "Profile", icon: Users },
];

export default function AdminLayout({
  children,
  title = "Dashboard",
  activePath,
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
    <main className="admin-dashboard">
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

        <nav id="admin-primary-nav" className="admin-nav" aria-label="Administrator navigation">
          {navigation.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              type="button"
              className={`admin-nav-item ${activePath === path || pathname === path ? "active" : ""}`}
              onClick={() => { if (path) navigate(path); setSidebarOpen(false); }}
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
          <button className="admin-mobile-nav-toggle" type="button" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-expanded={sidebarOpen} aria-controls="admin-primary-nav" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1>{title}</h1>

          <div className="admin-topbar-actions">
            <div className="admin-search">
              <span>⌕</span>
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
