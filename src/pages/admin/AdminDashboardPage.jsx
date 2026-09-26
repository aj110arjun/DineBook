import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import {
  Activity,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Restaurants", icon: Store },
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

export default function AdminDashboardPage() {
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
          {navigation.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={`admin-nav-item ${active ? "active" : ""}`}
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
          <h1>Dashboard</h1>

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
              <h2>Good morning, Maya</h2>
              <p>Here’s what’s happening across DineBook today.</p>
            </div>

            <span className="admin-status">Live platform status</span>
          </div>
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
