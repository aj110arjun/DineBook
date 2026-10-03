import { useEffect, useMemo, useState } from "react";
import {
  Bell, ChartNoAxesColumn, Check, CheckCheck, ChefHat, CircleHelp,
  CirclePlus, Clock3, LayoutDashboard, List, LogOut, Menu, Package,
  Search, Settings, ShoppingBag, Soup, Star, Timer, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";

const orders = [
  { id: "#DB1024", customer: "Priya Sharma", time: "12:45 PM", table: "Table 7", items: "9 items", status: "New", prep: "25 min" },
  { id: "#DB1023", customer: "James Chen", time: "12:38 PM", table: "Table 3", items: "4 items", status: "Preparing", prep: "15 min" },
  { id: "#DB1022", customer: "Ananya Iyer", time: "12:20 PM", table: "Table 9", items: "3 items", status: "Ready", prep: "18 min" },
  { id: "#DB1021", customer: "Rohan Das", time: "12:15 PM", table: "Table 5", items: "12 items", status: "Completed", prep: "32 min" },
  { id: "#DB1020", customer: "Sarah Miller", time: "12:02 PM", table: "Table 11", items: "2 items", status: "Cancelled", prep: "—" },
];

const pipeline = [
  { label: "New", value: 8, tone: "red" },
  { label: "Accepted", value: 4, tone: "orange" },
  { label: "Preparing", value: 5, tone: "orange" },
  { label: "Ready", value: 3, tone: "green" },
  { label: "Completed", value: 31, tone: "green" },
];

const activity = [
  { message: "Order #DB1024 received", time: "12:45 PM", tone: "red" },
  { message: "Chicken Biryani started preparing", time: "12:40 PM", tone: "orange" },
  { message: "Order #DB1021 marked ready", time: "12:35 PM", tone: "green" },
];

const chefNav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Kitchen Orders", icon: Bell },
  { label: "Reservations", icon: ShoppingBag },
  { label: "Menu", icon: List },
  { label: "Reviews", icon: Star },
  { label: "Analytics", icon: ChartNoAxesColumn },
  { label: "Profile", icon: ChefHat },
  { label: "Settings", icon: Settings },
];

export default function ChefDashboardPage() {
  const navigate = useNavigate();
  const [chef, setChef] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  }).format(new Date()), []);

  useEffect(() => {
    requestJson("/api/chef/me", { method: "GET" })
      .then(setChef)
      .catch(() => navigate("/chef/login", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      try {
        const categories = await requestJson("/api/chef/menu", { method: "GET" });
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

  async function handleLogout() {
    try {
      await requestJson("/api/auth/chef/logout", { method: "POST" });
    } finally {
      navigate("/chef/login", { replace: true });
    }
  }

  const firstName = chef?.name?.trim().split(/\s+/)[0] || "Chef";
  const avatarLetters = chef?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CA";

  return (
    <main className="chef-dashboard-shell">
      {sidebarOpen && <button className="chef-sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`chef-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="chef-brand"><span className="chef-brand-mark"><Check size={20} strokeWidth={3} /></span><span>DineBook</span><button className="chef-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="chef-identity-card">
          <div className="chef-avatar-large">{avatarLetters}</div>
          <div className="chef-identity-copy"><strong>{chef?.name || "Chef"}</strong><span>{chef?.restaurant_name || "Kitchen Team"}</span></div>
        </div>
        <nav className="chef-sidebar-nav" aria-label="Chef portal">
          {chefNav.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className={`chef-nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setSidebarOpen(false); if (label === "Menu") document.getElementById("chef-menu")?.scrollIntoView({ behavior: "smooth" }); }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="chef-nav-item chef-logout" onClick={handleLogout}><LogOut size={18} /><span>Logout</span></button>
      </aside>

      <section className="chef-dashboard-main">
        <header className="chef-topbar">
          <button type="button" className="chef-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="chef-topbar-title"><h1>Chef Dashboard</h1><p>{chef?.restaurant_name || "The Saffron Table"}<span>•</span>Today, {dateLabel}</p></div>
          <div className="chef-topbar-actions">
            <span className="chef-online-badge"><i /> ONLINE</span>
            <button className="chef-icon-button" aria-label="Search"><Search size={20} /></button>
            <button className="chef-icon-button chef-bell-button" aria-label="8 notifications"><Bell size={20} /><b>8</b></button>
            <button type="button" className="chef-account-button" onClick={handleLogout} title="Sign out">
              <span className="chef-avatar-small">{avatarLetters}</span><strong>{`Chef ${firstName}`}</strong><span className="chef-account-chevron">⌄</span>
            </button>
          </div>
        </header>

        <div className="chef-dashboard-content">
          <PortalBreadcrumb home={{ label: "Home", to: "/chef/dashboard" }} items={[{ label: activeNav }]} className="chef-breadcrumb" />
          <div className="chef-page-heading"><h2>Good Morning, Chef {firstName}</h2><p>Here's what's happening in your kitchen today.</p></div>

          <section className="chef-stat-grid" aria-label="Today's kitchen stats">
            <StatCard title="Today's Orders" value="47" change="+12%" icon={Package} tone="wine" />
            <StatCard title="New Orders" value="8" change="+4%" icon={CirclePlus} tone="wine" />
            <StatCard title="Preparing" value="5" change="-2%" icon={Soup} tone="amber" />
            <StatCard title="Ready" value="3" change="+1%" icon={CheckCheck} tone="green" />
            <StatCard title="Completed" value="31" change="+18%" icon={ShoppingBag} tone="green" />
            <StatCard title="Avg Prep Time" value="18m" change="-5%" icon={Timer} tone="wine" />
          </section>

          <div className="chef-overview-grid">
            <section className="chef-panel chef-pipeline-panel">
              <h3>Live Kitchen Pipeline Overview</h3>
              <div className="chef-pipeline-list">
                {pipeline.map((item) => <div className="chef-pipeline-item" key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong></div>)}
              </div>
            </section>
            <section className="chef-panel chef-activity-panel">
              <h3>Kitchen Activity Log</h3>
              <div className="chef-activity-list">{activity.map((item) => <div className="chef-activity-item" key={item.message}><i className={item.tone} /><div><p>{item.message}</p><span>{item.time}</span></div></div>)}</div>
            </section>
          </div>

          <section className="chef-panel chef-orders-panel">
            <div className="chef-panel-heading"><h3>Recent Orders Today</h3><button type="button" onClick={() => setActiveNav("Kitchen Orders")}>View kitchen orders</button></div>
            <div className="chef-orders-scroll"><table className="chef-orders-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Time</th><th>Table</th><th>Items</th><th>Status</th><th>Est. Prep</th><th>Action</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="chef-order-id">{order.id}</td><td>{order.customer}</td><td className="chef-muted-cell">{order.time}</td><td>{order.table}</td><td>{order.items}</td><td><span className={`chef-order-status ${order.status.toLowerCase()}`}>{order.status}</span></td><td>{order.prep}</td><td><button className="chef-view-order" type="button" onClick={() => setActiveNav("Kitchen Orders")}>View</button></td></tr>)}</tbody></table></div>
          </section>

          <section className="chef-dishes-section" id="chef-menu">
            <div className="chef-panel-heading"><h3>Restaurant Menu</h3><span className="chef-menu-refresh-note">Updates automatically</span></div>
            {menuLoading ? <p className="chef-menu-empty">Loading restaurant menu…</p> : menuError ? <p className="chef-menu-empty" role="alert">{menuError}</p> : menuCategories.length === 0 || menuCategories.every((category) => category.foods.length === 0) ? <p className="chef-menu-empty">No menu items have been added yet.</p> : menuCategories.map((category) => (
              <section className="chef-menu-category" key={category.id}>
                <h4>{category.name}</h4>
                <div className="chef-dish-grid">
                  {category.foods.map((food) => (
                    <article className="chef-dish-card" key={food.id}>
                      <div className="chef-dish-info">
                        <div className="chef-dish-title"><h4>{food.name}</h4><span className={`chef-menu-availability ${food.is_available ? "available" : "unavailable"}`}>{food.is_available ? "Available" : "Unavailable"}</span></div>
                        {food.description && <p className="chef-menu-description">{food.description}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>
          <footer className="chef-dashboard-footer"><span><Clock3 size={14} /> Kitchen dashboard</span><button type="button" onClick={() => setActiveNav("Settings")}><CircleHelp size={14} /> Help & support</button></footer>
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value, change, icon: Icon, tone }) {
  return <article className="chef-stat-card"><div className="chef-stat-top"><span>{title}</span><span className={`chef-stat-icon ${tone}`}><Icon size={18} /></span></div><strong className="chef-stat-value">{value}</strong><p><b>{change}</b><span> vs yesterday</span></p></article>;
}
