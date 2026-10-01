import { useNavigate } from "react-router-dom";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { requestJson } from "../../lib/authApi.js";
import {
  Activity,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  SlidersHorizontal,
  Store,
  Users,
  WalletCards,
  Utensils,
  CreditCard,
  Clock3,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    active: true,
    path: "/admin/dashboard",
  },
  { label: "Restaurants", icon: Store, path: "/admin/restaurants" },
  { label: "Users", icon: Users },
  { label: "Payments", icon: WalletCards },
  { label: "Offers", icon: SlidersHorizontal },
  { label: "Reviews & Reports", icon: FileText },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Notifications", icon: Bell },
  { label: "Activity Logs", icon: Activity },
  { label: "Settings", icon: Settings },
  { label: "Requests", icon: SlidersHorizontal, path: "/admin/requests" },
  { label: "Profile", icon: Users },
];

const reservationData = [
  { month: "Apr", value: 48 },
  { month: "May", value: 67 },
  { month: "Jun", value: 55 },
  { month: "Jul", value: 83 },
  { month: "Aug", value: 76 },
  { month: "Sep", value: 100 },
];

const revenueData = [
  { month: "Apr", value: 58 },
  { month: "May", value: 88 },
  { month: "Jun", value: 38 },
  { month: "Jul", value: 52 },
  { month: "Aug", value: 24 },
  { month: "Sep", value: 100 },
];

const activities = [
  {
    text: "Ava Rodriguez submitted Bistro Luna for approval",
    time: "1 hour ago",
  },
  {
    text: "Payment settlement completed for 184 restaurants",
    time: "2 hours ago",
  },
  {
    text: "Noah Williams updated The Copper Table profile",
    time: "3 hours ago",
  },
  {
    text: "New owner account created by Olivia Martin",
    time: "4 hours ago",
  },
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
      {/* Sidebar */}
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

      {/* Main */}
      <section className="admin-dashboard-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <h1>Dashboard</h1>

          <div className="admin-topbar-actions">
            <div className="admin-search">
              <span className="admin-search-icon">⌕</span>

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

        {/* Dashboard content */}
        <div className="admin-dashboard-content">
          <PortalBreadcrumb home={{ label: "Admin", to: "/admin/dashboard" }} items={[{ label: "Dashboard" }]} className="admin-breadcrumb" />
          {/* Heading */}
          <div className="admin-dashboard-heading">
            <div>
              <h2>Good morning, Maya</h2>
              <p>Here’s what’s happening across DineBook today.</p>
            </div>

            <span className="admin-status">Live platform status</span>
          </div>

          {/* Statistics */}
          <div className="admin-stat-grid">
            <AdminStatCard
              title="Total owners"
              value="1,248"
              change="+8.2% vs last month"
              icon={Users}
            />

            <AdminStatCard
              title="Restaurants"
              value="3,682"
              change="+5.4% vs last month"
              icon={Store}
            />

            <AdminStatCard
              title="Users"
              value="84,291"
              change="+12.1% vs last month"
              icon={Users}
            />

            <AdminStatCard
              title="Reservations"
              value="12,840"
              change="+9.6% vs last month"
              icon={CalendarDays}
            />

            <AdminStatCard
              title="Orders"
              value="9,426"
              change="+7.8% vs last month"
              icon={WalletCards}
            />

            <AdminStatCard
              title="Revenue"
              value="$428.6K"
              change="+14.3% vs last month"
              icon={CreditCard}
            />

            <AdminStatCard
              title="Pending approvals"
              value="23"
              change="Needs review vs last month"
              icon={Clock3}
              warning
            />
          </div>

          {/* Charts */}
          <div className="admin-chart-grid">
            <AdminChart title="Reservation trends" data={reservationData} />

            <AdminChart title="Revenue trends" data={revenueData} />
          </div>

          {/* Bottom sections */}
          <div className="admin-bottom-grid">
            {/* Recent activities */}
            <section className="admin-panel">
              <div className="admin-panel-header">
                <h3>Recent activities</h3>

                <button type="button">View all</button>
              </div>

              <div className="admin-activity-list">
                {activities.map((activity) => (
                  <div className="admin-activity-item" key={activity.text}>
                    <div className="admin-activity-icon">
                      <Activity size={14} />
                    </div>

                    <div>
                      <strong>{activity.text}</strong>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Alerts */}
            <section className="admin-panel admin-alert-panel">
              <div className="admin-panel-header">
                <h3>Alerts</h3>

                <button type="button">Manage</button>
              </div>

              <div className="admin-alert-list">
                <div className="admin-alert-item">
                  <span className="admin-alert-dot warning" />

                  <div>
                    <strong>23 approvals waiting</strong>
                    <span>Owner verification queue</span>
                  </div>
                </div>

                <div className="admin-alert-item">
                  <span className="admin-alert-dot danger" />

                  <div>
                    <strong>4 payment disputes</strong>
                    <span>Action recommended</span>
                  </div>
                </div>

                <div className="admin-alert-item">
                  <span className="admin-alert-dot success" />

                  <div>
                    <strong>99.98% uptime</strong>
                    <span>All systems operational</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminStatCard({ title, value, change, icon: Icon, warning = false }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{title}</span>

        <div className="admin-stat-icon">
          <Icon size={16} />
        </div>
      </div>

      <strong className="admin-stat-value">{value}</strong>

      <span className={warning ? "admin-stat-warning" : "admin-stat-change"}>
        {change}
      </span>
    </article>
  );
}

function AdminChart({ title, data }) {
  return (
    <section className="admin-panel admin-chart-panel">
      <div className="admin-panel-header">
        <h3>{title}</h3>

        <button type="button">Last 6 months⌄</button>
      </div>

      <div className="admin-chart">
        {data.map((item) => (
          <div className="admin-chart-column" key={item.month}>
            <div className="admin-chart-bar-wrapper">
              <div
                className="admin-chart-bar"
                style={{ height: `${item.value}%` }}
              />
            </div>

            <span>{item.month}</span>
          </div>
        ))}
      </div>
    </section>
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
