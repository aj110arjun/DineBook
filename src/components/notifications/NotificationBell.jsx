import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "./notifications.css";

const PREFIX = { customer: "/customer", chef: "/chef", manager: "/manager", admin: "/admin" };
const pathFor = (item, role) => {
  const prefix = PREFIX[role];
  const path = item.action_url;
  return typeof path === "string" && path.startsWith(`${prefix}/`) ? path : prefix;
};
const ago = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationBell({ role, enabled = true }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [list, unread] = await Promise.all([
        requestJson("/api/notifications?limit=8"),
        requestJson("/api/notifications/unread-count"),
      ]);
      setItems(list.items || []);
      setCount(unread.count || 0);
      setError("");
    } catch (e) { setError(e.message); }
  }, [enabled]);
  useRealtimeEvents({ enabled, onEvent: (event) => { if (event?.event_type === "notification.created") refresh(); }, onReconnect: refresh });
  useEffect(() => { refresh(); }, [refresh]);

  async function markAll() {
    try { await requestJson("/api/notifications/read-all", { method: "PATCH" }); await refresh(); }
    catch (e) { setError(e.message); }
  }
  async function openItem(item) {
    try { if (!item.is_read) await requestJson(`/api/notifications/${item.id}/read`, { method: "PATCH" }); }
    catch (e) { setError(e.message); }
    setOpen(false);
    navigate(pathFor(item, role));
    refresh();
  }
  if (!enabled) return null;
  return <div className="db-notification-wrap">
    <button type="button" className="db-notification-bell" aria-label={`Notifications, ${count} unread`} aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) refresh(); }}>
      <Bell size={19} />{count > 0 && <span className="db-notification-count">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section className="db-notification-popover" aria-label="Recent notifications">
      <header><div><strong>Notifications</strong><small>{count} unread</small></div><button type="button" onClick={markAll} disabled={!count} aria-label="Mark all as read"><CheckCheck size={17} /></button></header>
      {error && <p className="db-notification-error">{error} <button type="button" onClick={refresh}>Retry</button></p>}
      <div className="db-notification-list">{items.length ? items.map((item) => <button type="button" key={item.id} className={`db-notification-item${item.is_read ? "" : " unread"}`} onClick={() => openItem(item)}>
        <span className={`db-notification-icon ${item.category.toLowerCase()}`}><Bell size={16} /></span><span className="db-notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{ago(item.created_at)}</small></span>{!item.is_read && <i className="db-unread-dot" />}
      </button>) : <p className="db-notification-empty">You’re all caught up.</p>}</div>
      <footer><button type="button" onClick={() => { setOpen(false); navigate(`${PREFIX[role]}/notifications`); }}>View all</button></footer>
    </section>}
  </div>;
}
