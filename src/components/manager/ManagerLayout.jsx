import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Grid2X2,
  LogOut,
  Menu,
  MessageCircle,
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

const navigationGroups = [
  {
    label: "Today’s work",
    items: [
      { label: "Dashboard", icon: Grid2X2, to: "/manager/dashboard" },
      { label: "Reservations", icon: CalendarDays, to: "/manager/reservations" },
      { label: "Orders", icon: ClipboardList, to: "/manager/orders" },
      { label: "New walk-in order", icon: ClipboardList, to: "/manager/spot-order" },
    ],
  },
  {
    label: "Restaurant setup",
    items: [
      { label: "Restaurant details", icon: Store, to: "/manager/restaurant-location" },
      { label: "Opening hours", icon: Clock3, to: "/manager/operating-hours" },
      { label: "Tables & floors", icon: Table2, to: "/manager/tables" },
      { label: "Menu", icon: Utensils, to: "/manager/menu" },
      { label: "Staff", icon: Users, to: "/manager/staff" },
    ],
  },
  {
    label: "Grow your business",
    items: [
      { label: "Offers", icon: Tag, to: "/manager/offers" },
      { label: "Reviews", icon: MessageCircle, to: "/manager/reviews" },
      { label: "Revenue & wallet", icon: CircleDollarSign, to: "/manager/revenue" },
      { label: "Payments", icon: ClipboardList, to: "/manager/payments" },
    ],
  },
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
        <nav id="manager-primary-nav" className="manager-nav" aria-label="Restaurant workspace">
          {navigationGroups.map((group) => (
            <div className="manager-nav-group" key={group.label}>
              <h2 className="manager-nav-group-title">{group.label}</h2>
              {group.items.map(({ label, icon: Icon, to }) => {
                const active = to === pathname || pathname.startsWith(`${to}/`) ||
                  (to === "/manager/tables" && pathname.startsWith("/manager/floors"));
                return (
                  <button
                    key={label}
                    type="button"
                    className={`manager-nav-item ${active ? "active" : ""}`}
                    onClick={() => {
                      navigate(to);
                      setSidebarOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
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
              aria-expanded={sidebarOpen}
              aria-controls="manager-primary-nav"
            >
              <Menu size={21} />
            </button>
            <h1>{title}</h1>
          </div>
          <div className="manager-topbar-right">
            <NotificationBell role="manager" />
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
