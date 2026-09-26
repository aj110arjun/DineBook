import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
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
  { label: "Offers", icon: ShieldCheck },
  { label: "Reviews & Reports", icon: FileText },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Notifications", icon: Bell },
  { label: "Activity Logs", icon: Activity },
  { label: "Settings", icon: Settings },
  { label: "Requests", icon: SlidersHorizontal },
  { label: "Profile", icon: Users },
];

export default function AdminLayout({
  children,
  title = "Dashboard",
  activePath,
}) {
  const navigate = useNavigate();

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
          {navigation.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              type="button"
              className={`admin-nav-item ${
                activePath === path ? "active" : ""
              }`}
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
