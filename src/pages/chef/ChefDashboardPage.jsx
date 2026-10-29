import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChartNoAxesColumn,
  Check,
  CheckCheck,
  CirclePlus,
  Clock3,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Soup,
  Timer,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import NotificationBell from "../../components/notifications/NotificationBell.jsx";

const chefNav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Kitchen orders", icon: Bell, to: "/chef/orders" },
  { label: "Menu", icon: List, to: "/chef/menu" },
  { label: "Service hours", icon: Clock3, to: "/chef/service-hours" },
  { label: "Revenue & wallet", icon: ChartNoAxesColumn, to: "/chef/revenue" },
];

export default function ChefDashboardPage() {
  const navigate = useNavigate();
  const [chef, setChef] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    requestJson("/api/chef/me", { method: "GET" })
      .then(setChef)
      .catch(() => navigate("/chef/login", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      try {
        const categories = await requestJson("/api/chef/menu", {
          method: "GET",
        });
        if (active) {
          setMenuCategories(categories);
          setMenuError("");
        }
      } catch (error) {
        if (active) setMenuError(error.message);
      } finally {
        if (active) setMenuLoading(false);
      }
    }
    loadMenu();
    const timer = window.setInterval(loadMenu, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await requestJson("/api/chef/orders"));
      setOrdersError("");
    } catch (error) {
      setOrdersError(error.message || "Could not refresh kitchen orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);
  const refreshLiveData = useCallback(() => loadOrders(), [loadOrders]);
  useRealtimeEvents({
    enabled: Boolean(chef),
    onEvent: refreshLiveData,
    onReconnect: refreshLiveData,
  });
  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(loadOrders, 60000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  async function handleLogout() {
    try {
      await requestJson("/api/auth/chef/logout", { method: "POST" });
    } finally {
      navigate("/chef/login", { replace: true });
    }
  }

  const firstName = chef?.name?.trim().split(/\s+/)[0] || "Chef";
  const avatarLetters =
    chef?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CA";
  const todayOrders = orders.filter(
    (order) =>
      new Date(order.created_at).toDateString() === new Date().toDateString(),
  );
  const countStatus = (status) =>
    todayOrders.filter((order) => order.status === status).length;
  const pipeline = [
    { label: "New", value: countStatus("PLACED"), tone: "red" },
    { label: "Accepted", value: countStatus("ACCEPTED"), tone: "orange" },
    { label: "Preparing", value: countStatus("PREPARING"), tone: "orange" },
    { label: "Ready", value: countStatus("READY"), tone: "green" },
    { label: "Completed", value: countStatus("COMPLETED"), tone: "green" },
  ];
  const recentOrders = [...todayOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);
  const activity = [...orders]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)
    .map((order) => ({
      message: `Order #${order.id.slice(0, 8).toUpperCase()} is ${order.status.toLowerCase().replaceAll("_", " ")}`,
      time: new Date(order.updated_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tone:
        order.status === "COMPLETED"
          ? "green"
          : order.status === "PREPARING"
            ? "orange"
            : "red",
    }));

  return (
    <main className="chef-dashboard-shell">
      {sidebarOpen && (
        <button
          className="chef-sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`chef-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="chef-brand">
          <span className="chef-brand-mark">
            <Check size={20} strokeWidth={3} />
          </span>
          <span>DineBook</span>
          <button
            className="chef-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="chef-identity-card">
          <div className="chef-avatar-large">{avatarLetters}</div>
          <div className="chef-identity-copy">
            <strong>{chef?.name || "Chef"}</strong>
            <span>{chef?.restaurant_name || "Kitchen Team"}</span>
          </div>
        </div>
        <nav
          id="chef-primary-nav"
          className="chef-sidebar-nav"
          aria-label="Chef portal"
        >
          {chefNav.map(({ label, icon: Icon, to, section }) => (
            <button
              key={label}
              type="button"
              className={`chef-nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => {
                setActiveNav(label);
                setSidebarOpen(false);
                if (to) navigate(to);
                if (section)
                  document
                    .getElementById(section)
                    ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="chef-nav-item chef-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <section className="chef-dashboard-main">
        <header className="chef-topbar">
          <button
            type="button"
            className="chef-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="chef-primary-nav"
          >
            <Menu size={21} />
          </button>
          <div className="chef-topbar-title">
            <h1>Chef Dashboard</h1>
            <p>
              <span className="chef-context-name">
                {chef?.restaurant_name || "The Saffron Table"}
              </span>
              <span className="chef-context-separator" aria-hidden="true">
                •
              </span>
              <span className="chef-context-date">Today, {dateLabel}</span>
            </p>
          </div>
          <div className="chef-topbar-actions">
            <NotificationBell role="chef" enabled={Boolean(chef)} />
          </div>
        </header>

        <div className="chef-dashboard-content">
          <PortalBreadcrumb
            home={{ label: "Home", to: "/chef/dashboard" }}
            items={[{ label: activeNav }]}
            className="chef-breadcrumb"
          />
          <div className="chef-page-heading">
            <h2>Good Morning, Chef {firstName}</h2>
            <p>Here's what's happening in your kitchen today.</p>
          </div>

          <section
            className="chef-stat-grid"
            aria-label="Today's kitchen stats"
          >
            <StatCard
              title="Today's Orders"
              value={todayOrders.length}
              icon={Package}
              tone="wine"
            />
            <StatCard
              title="New Orders"
              value={countStatus("PLACED")}
              icon={CirclePlus}
              tone="wine"
            />
            <StatCard
              title="Preparing"
              value={countStatus("PREPARING")}
              icon={Soup}
              tone="amber"
            />
            <StatCard
              title="Ready"
              value={countStatus("READY")}
              icon={CheckCheck}
              tone="green"
            />
            <StatCard
              title="Completed"
              value={countStatus("COMPLETED")}
              icon={ShoppingBag}
              tone="green"
            />
            <StatCard
              title="Accepted"
              value={countStatus("ACCEPTED")}
              icon={Timer}
              tone="wine"
            />
          </section>

          <div className="chef-overview-grid">
            <section className="chef-panel chef-pipeline-panel">
              <h3>Live Kitchen Pipeline Overview</h3>
              <div className="chef-pipeline-list">
                {pipeline.map((item) => (
                  <div className="chef-pipeline-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong className={item.tone}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="chef-panel chef-activity-panel">
              <h3>Kitchen Activity Log</h3>
              <div className="chef-activity-list">
                {activity.map((item) => (
                  <div className="chef-activity-item" key={item.message}>
                    <i className={item.tone} />
                    <div>
                      <p>{item.message}</p>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="chef-menu-empty">No kitchen activity yet.</p>
                )}
              </div>
            </section>
          </div>

          <section className="chef-panel chef-orders-panel">
            <div className="chef-panel-heading">
              <h3>Recent orders today</h3>
              <button type="button" onClick={() => navigate("/chef/orders")}>
                View all kitchen orders
              </button>
            </div>
            <div className="chef-orders-scroll">
              <table className="chef-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Time</th>
                    <th>Table</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="chef-order-id">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td>{order.customer_name}</td>
                      <td className="chef-muted-cell">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        {order.reservation?.tables
                          ?.map((table) => table.table_number)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        {order.items.reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0,
                        )}{" "}
                        items
                      </td>
                      <td>
                        <span
                          className={`chef-order-status ${order.status.toLowerCase()}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <button
                          className="chef-view-order"
                          type="button"
                          onClick={() => navigate("/chef/orders")}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="7">
                        {ordersLoading
                          ? "Loading kitchen orders…"
                          : ordersError || "No orders today."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="chef-dishes-section" id="chef-menu">
            <div className="chef-panel-heading">
              <h3>Restaurant Menu</h3>
              <span className="chef-menu-refresh-note">
                Updates automatically
              </span>
            </div>
            {menuLoading ? (
              <p className="chef-menu-empty">Loading restaurant menu…</p>
            ) : menuError ? (
              <p className="chef-menu-empty" role="alert">
                {menuError}
              </p>
            ) : menuCategories.length === 0 ||
              menuCategories.every(
                (category) => category.foods.length === 0,
              ) ? (
              <p className="chef-menu-empty">
                No menu items have been added yet.
              </p>
            ) : (
              menuCategories.map((category) => (
                <section className="chef-menu-category" key={category.id}>
                  <h4>{category.name}</h4>
                  <div className="chef-dish-grid">
                    {category.foods.map((food) => (
                      <article className="chef-dish-card" key={food.id}>
                        {food.image_url && (
                          <img
                            className="chef-dish-image"
                            src={food.image_url}
                            alt={food.name}
                            loading="lazy"
                          />
                        )}
                        <div className="chef-dish-info">
                          <div className="chef-dish-title">
                            <h4>{food.name}</h4>
                            <span
                              className={`chef-menu-availability ${food.is_available ? "available" : "unavailable"}`}
                            >
                              {food.is_available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                          {food.description && (
                            <p className="chef-menu-description">
                              {food.description}
                            </p>
                          )}
                          {food.variants?.length > 0 && (
                            <ul className="chef-dish-variants">
                              {food.variants.map((variant) => (
                                <li key={variant.id}>
                                  <span>
                                    {variant.name}
                                    {!variant.is_available
                                      ? " · Unavailable"
                                      : ""}
                                  </span>
                                  <strong>
                                    ₹{Number(variant.price).toFixed(2)}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            )}
          </section>
          <footer className="chef-dashboard-footer">
            <span>
              <Clock3 size={14} /> Kitchen dashboard
            </span>
            <button
              type="button"
              onClick={() => navigate("/chef/change-password")}
            >
              <Settings size={14} /> Change password
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, change, icon: Icon, tone }) {
  return (
    <article className="chef-stat-card">
      <div className="chef-stat-top">
        <span>{title}</span>
        <span className={`chef-stat-icon ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong className="chef-stat-value">{value}</strong>
      <p>
        <b>{change}</b>
        <span> vs yesterday</span>
      </p>
    </article>
  );
}
