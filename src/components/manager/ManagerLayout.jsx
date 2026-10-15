import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Grid2X2,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Clock3,
  Star,
  Store,
  Table2,
  Tag,
  Utensils,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import NotificationBell from "../notifications/NotificationBell.jsx";

const navigation = [
  { label: "Dashboard", icon: Grid2X2, to: "/manager/dashboard" },
  { label: "Restaurant", icon: Store, to: "/manager/restaurant-location" },
  { label: "Reservations & Orders", icon: CalendarDays, to: "/manager/reservations" },
  { label: "Operating Hours", icon: Clock3, to: "/manager/operating-hours" },
  { label: "Tables", icon: Table2, to: "/manager/tables" },
  { label: "Menu", icon: Utensils, to: "/manager/menu" },
  { label: "Spot Order", icon: ClipboardList, to: "/manager/spot-order" },
  { label: "Staff", icon: Users, to: "/manager/staff" },
  { label: "Offers", icon: Tag, to: "/manager/offers" },
  { label: "Reviews", icon: MessageCircle, to: "/manager/reviews" },
  { label: "Revenue & Wallet", icon: CircleDollarSign, to: "/manager/revenue" },
  { label: "Payments", icon: ClipboardList, to: "/manager/payments" },
  { label: "Notifications", icon: Bell, to: "/manager/notifications" },
  { label: "Settings", icon: Settings },
];

export default function ManagerLayout({ children, title = "Dashboard" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    try {
      await requestJson("/api/auth/manager/logout", { method: "POST" });
    } finally {
      navigate("/manager/login", { replace: true });
    }
  }

  return (
    <main className="manager-dashboard db-portal-shell">
      {sidebarOpen && (
        <button
          className="manager-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`manager-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="manager-sidebar-brand">
          <div className="manager-brand-mark">
            <Utensils size={16} />
          </div>
          <span>DineBook</span>
          <button
            className="manager-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="manager-restaurant-card">
          <strong>Restaurant</strong>
          <span>Owner Console</span>
        </div>
        <nav className="manager-nav">
          {navigation.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              type="button"
              className={`manager-nav-item ${to === pathname || (label === "Reservations & Orders" && (pathname.startsWith("/manager/reservations") || pathname.startsWith("/manager/orders"))) || (label === "Menu" && pathname.startsWith("/manager/menu")) || (label === "Payments" && pathname.startsWith("/manager/payments")) || (label === "Offers" && pathname.startsWith("/manager/offers")) ? "active" : ""}`}
              onClick={() => {
                if (to) navigate(to);
                setSidebarOpen(false);
              }}
              aria-current={to === pathname ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="manager-sidebar-bottom">
          <button
            className="manager-nav-item"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="manager-dashboard-main db-portal-main">
        <header className="manager-topbar db-portal-topbar">
          <div className="manager-topbar-left">
            <button
              className="manager-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <h1>{title}</h1>
            <span className="manager-order-status-badge">
              <span />
              Accepting Orders
            </span>
          </div>
          <div className="manager-topbar-right">
            <div className="manager-search">
              <Search size={15} />
              <input type="text" placeholder="Search transactions, tables..." />
            </div>
            <NotificationBell role="manager" />
            <button className="manager-profile" type="button">
              <div className="manager-profile-avatar">MB</div>
              <div>
                <strong>Manager</strong>
                <span>Owner Partner</span>
              </div>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
