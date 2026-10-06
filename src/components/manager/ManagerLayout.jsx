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
  ShoppingBasket,
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

const navigation = [
  { label: "Dashboard", icon: Grid2X2, to: "/manager/dashboard" },
  { label: "Restaurant", icon: Store },
  { label: "Reservations", icon: CalendarDays, to: "/manager/reservations" },
  { label: "Tables", icon: Table2, to: "/manager/tables" },
  { label: "Menu", icon: Utensils, to: "/manager/menu" },
  { label: "Orders", icon: ShoppingBasket },
  { label: "Staff", icon: Users, to: "/manager/staff" },
  { label: "Offers", icon: Tag },
  { label: "Reviews", icon: MessageCircle },
  { label: "Analytics", icon: CircleDollarSign },
  { label: "Payments", icon: ClipboardList },
  { label: "Notifications", icon: Bell },
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
    <main className="manager-dashboard">
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
              className={`manager-nav-item ${to === pathname || (label === "Menu" && pathname.startsWith("/manager/menu")) ? "active" : ""}`}
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

      <section className="manager-dashboard-main">
        <header className="manager-topbar">
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
            <button
              className="manager-notification-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span>3</span>
            </button>
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
