import { useEffect, useState } from "react";
import { Bell, Check, ChartNoAxesColumn, Clock3, LayoutDashboard, List, LogOut, Menu, ShoppingBag, Star, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import NotificationBell from "../notifications/NotificationBell.jsx";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/chef/dashboard" },
  { label: "Kitchen Orders", icon: Bell, to: "/chef/orders" },
  { label: "Reservations", icon: ShoppingBag, to: "/chef/dashboard#chef-reservations" },
  { label: "Menu", icon: List, to: "/chef/dashboard#chef-menu" },
  { label: "Service Hours", icon: Clock3, to: "/chef/service-hours" },
  { label: "Reviews", icon: Star, to: "/chef/reviews" },
  { label: "Notifications", icon: Bell, to: "/chef/notifications" },
  { label: "Revenue & Wallet", icon: ChartNoAxesColumn, to: "/chef/revenue" },
];

export default function ChefLayout({ title, children }) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [chef, setChef] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatar = chef?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CA";

  useEffect(() => {
    requestJson("/api/chef/me").then(setChef).catch(() => navigate("/chef/login", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (!hash) return;
    const sectionId = hash.slice(1);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    });
  }, [hash]);

  async function logout() {
    try { await requestJson("/api/auth/chef/logout", { method: "POST" }); }
    finally { navigate("/chef/login", { replace: true }); }
  }

  return <main className="chef-dashboard-shell db-portal-shell">
    {sidebarOpen && <button className="chef-sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <aside className={`chef-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="chef-brand"><span className="chef-brand-mark"><Check size={20} strokeWidth={3} /></span><span>DineBook</span><button className="chef-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <div className="chef-identity-card"><div className="chef-avatar-large">{avatar}</div><div className="chef-identity-copy"><strong>{chef?.name || "Chef"}</strong><span>{chef?.restaurant_name || "Kitchen Team"}</span></div></div>
      <nav id="chef-primary-nav" className="chef-sidebar-nav" aria-label="Chef portal">
        {navigation.map(({ label, icon: Icon, to }) => <button key={label} type="button" className={`chef-nav-item ${label === title ? "active" : ""}`} onClick={() => { setSidebarOpen(false); if (to) navigate(to); else navigate("/chef/dashboard"); }}><Icon size={18} /><span>{label}</span></button>)}
      </nav>
        <button type="button" className="chef-nav-item chef-logout" onClick={logout}><LogOut size={18} /><span>Sign out</span></button>
    </aside>
    <section className="chef-dashboard-main db-portal-main">
      <header className="chef-topbar db-portal-topbar">
        <button type="button" className="chef-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu" aria-expanded={sidebarOpen} aria-controls="chef-primary-nav"><Menu size={21} /></button>
        <div className="chef-topbar-title"><h1>{title}</h1><p>{chef?.restaurant_name || "Kitchen Team"}<span>•</span>Kitchen workspace</p></div>
        <div className="chef-topbar-actions"><NotificationBell role="chef" enabled={Boolean(chef)} /></div>
      </header>
      <div className="chef-kitchen-content">{children}</div>
    </section>
  </main>;
}
