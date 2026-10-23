import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck, X } from "lucide-react";
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
  const [filter, setFilter] = useState("unread");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const requestId = useRef(0);
  const panelId = useId();
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const [list, unread] = await Promise.all([
        requestJson(`/api/notifications?limit=8${filter === "unread" ? "&unread=true" : ""}`),
        requestJson("/api/notifications/unread-count"),
      ]);
      if (currentRequest !== requestId.current) return;
      setItems(list.items || []);
      setCount(unread.count || 0);
      setError("");
    } catch (e) { if (currentRequest === requestId.current) setError(e.message); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [enabled, filter]);
  useRealtimeEvents({ enabled, onEvent: (event) => { if (event?.event_type === "notification.created") refresh(); }, onReconnect: refresh });
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") { setOpen(false); bellRef.current?.focus(); }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function markAll() {
    setMarking(true);
    try { await requestJson("/api/notifications/read-all", { method: "PATCH" }); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setMarking(false); }
  }
  async function openItem(item) {
    try { if (!item.is_read) await requestJson(`/api/notifications/${item.id}/read`, { method: "PATCH" }); }
    catch (e) { setError(e.message); }
    setOpen(false);
    navigate(pathFor(item, role));
    refresh();
  }
  if (!enabled) return null;
  return <div className="db-notification-wrap" ref={wrapRef}>
    <button type="button" className="db-notification-bell" ref={bellRef} aria-controls={open ? panelId : undefined} aria-label={`Notifications, ${count} unread`} aria-expanded={open} onClick={() => { setOpen((v) => !v); if (!open) refresh(); }}>
      <Bell size={19} />{count > 0 && <span className="db-notification-count">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section id={panelId} className="db-notification-popover" aria-label="Recent notifications">
      <header>
        <span className="db-notification-header-icon"><Bell size={22} /></span>
        <div><strong>Notifications</strong><small>{count ? `${count} unread notification${count === 1 ? "" : "s"}` : "No unread notifications"}</small></div>
        <button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); bellRef.current?.focus(); }}><X size={19} /></button>
      </header>
      <div className="db-notification-toolbar">
        <div className="db-notification-tabs" role="group" aria-label="Filter notifications">
          <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread <span>{count > 99 ? "99+" : count}</span></button>
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
        </div>
        <button type="button" className="db-notification-mark-all" onClick={markAll} disabled={!count || marking} aria-label="Mark all as read" title="Mark all as read"><CheckCheck size={18} /></button>
      </div>
      {error && <p className="db-notification-error" role="alert">{error} <button type="button" onClick={refresh}>Retry</button></p>}
      <div className="db-notification-list" aria-live="polite" aria-busy={loading}>
        {loading ? <div className="db-notification-skeletons" role="status" aria-label="Loading notifications"><div /><div /><div /></div> : items.length ? items.map((item) => <button type="button" key={item.id} className={`db-notification-item${item.is_read ? "" : " unread"}`} onClick={() => openItem(item)}>
          <span className={`db-notification-icon ${item.category.toLowerCase()}`}><Bell size={16} /></span><span className="db-notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{ago(item.created_at)}</small></span>{!item.is_read && <i className="db-unread-dot" />}
        </button>) : !error && <div className="db-notification-empty"><BellOff size={40} strokeWidth={1.4} /><strong>{filter === "unread" ? "You’re all caught up" : "No notifications yet"}</strong><span>{filter === "unread" ? "No unread notifications found." : "Your latest updates will appear here."}</span></div>}
      </div>
    </section>}
  </div>;
}
