import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import NotificationBell from "../../components/notifications/NotificationBell.jsx";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "../../components/notifications/notifications.css";

const categories = [
  "ALL",
  "RESERVATION",
  "ORDER",
  "PAYMENT",
  "REVIEW",
  "STAFF",
  "APPROVAL",
  "SYSTEM",
];
const prefix = {
  customer: "/customer",
  chef: "/chef",
  manager: "/manager",
  admin: "/admin",
};
const relativeTime = (date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export default function NotificationsPage({ role }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("ALL");
  const [unread, setUnread] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const navigate = useNavigate();
  const limit = 15;
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (category !== "ALL") query.set("category", category);
      if (unread) query.set("unread", "true");
      const result = await requestJson(`/api/notifications?${query}`);
      setItems(result.items || []);
      setTotal(result.total || 0);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [category, offset, unread]);
  useEffect(() => {
    load();
  }, [load]);
  useRealtimeEvents({
    enabled: true,
    onEvent: (event) => { if (event?.event_type === "notification.created") load(); },
    onReconnect: load,
  });
  useEffect(() => {
    requestJson("/api/notifications/preferences")
      .then((x) => setPreferences(x.preferences))
      .catch(() => {});
  }, []);

  async function mutate(id, action) {
    try {
      if (action === "read")
        await requestJson(`/api/notifications/${id}/read`, { method: "PATCH" });
      else await requestJson(`/api/notifications/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function markAll() {
    try {
      await requestJson("/api/notifications/read-all", { method: "PATCH" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function togglePreference(key) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      const result = await requestJson("/api/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ preferences: { [key]: next[key] } }),
      });
      setPreferences(result.preferences);
    } catch (e) {
      setError(e.message);
      setPreferences(preferences);
    }
  }
  function go(item) {
    const path = item.action_url;
    navigate(
      typeof path === "string" && path.startsWith(`${prefix[role]}/`)
        ? path
        : prefix[role],
    );
  }
  const start = total ? offset + 1 : 0;
  return (
    <main className="db-notifications-page">
      <header className="db-notifications-heading">
        <div>
          <span className="db-notifications-kicker">YOUR ACTIVITY</span>
          <h1>Notifications</h1>
          <p>Updates and reminders for your DineBook account.</p>
        </div>
        <div className="db-notifications-heading-actions">
          <NotificationBell role={role} />
          <button className="db-mark-all" type="button" onClick={markAll}>
            <CheckCheck size={17} />
            Mark all as read
          </button>
        </div>
      </header>
      {error && (
        <div className="db-notifications-error" role="alert">
          {error}
          <button type="button" onClick={load}>
            Retry
          </button>
        </div>
      )}
      <div className="db-notifications-filters">
        <div className="db-category-tabs">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              onClick={() => {
                setCategory(item);
                setOffset(0);
              }}
            >
              {item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <label className="db-unread-filter">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              setUnread(e.target.checked);
              setOffset(0);
            }}
          />
          Unread only
        </label>
      </div>
      <section className="db-notifications-card" aria-live="polite">
        {busy ? (
          <div className="db-notification-skeletons">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} />
            ))}
          </div>
        ) : items.length ? (
          items.map((item) => (
            <article
              className={`db-notification-row${item.is_read ? "" : " unread"}`}
              key={item.id}
            >
              <span
                className={`db-notification-icon ${item.category.toLowerCase()}`}
              >
                <Bell size={18} />
              </span>
              <button
                type="button"
                className="db-notification-row-main"
                onClick={() => go(item)}
              >
                <strong>{item.title}</strong>
                <span>{item.message}</span>
                <small>
                  {item.category} · {relativeTime(item.created_at)}
                </small>
              </button>
              <div className="db-notification-row-actions">
                {!item.is_read && (
                  <button
                    type="button"
                    title="Mark as read"
                    aria-label="Mark as read"
                    onClick={() => mutate(item.id, "read")}
                  >
                    <Check size={17} />
                  </button>
                )}
                <button
                  type="button"
                  title="Dismiss"
                  aria-label="Dismiss notification"
                  onClick={() => mutate(item.id, "delete")}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="db-notifications-empty">
            <span>
              <Bell size={24} />
            </span>
            <strong>No notifications here</strong>
            <p>New updates will show up here.</p>
          </div>
        )}
      </section>
      <footer className="db-notifications-pagination">
        <span>
          {start}–{Math.min(offset + limit, total)} of {total}
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous page"
            disabled={offset === 0 || busy}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={offset + limit >= total || busy}
            onClick={() => setOffset(offset + limit)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
      {preferences && (
        <section className="db-preferences">
          <h2>Notification preferences</h2>
          <p>
            Choose which optional updates you receive. Essential account and
            operational alerts may still be sent.
          </p>
          <div>
            {categories
              .filter((x) => x !== "ALL")
              .map((key) => (
                <label key={key}>
                  <span>{key[0] + key.slice(1).toLowerCase()}</span>
                  <input
                    type="checkbox"
                    checked={preferences[key] !== false}
                    onChange={() => togglePreference(key)}
                  />
                </label>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}
