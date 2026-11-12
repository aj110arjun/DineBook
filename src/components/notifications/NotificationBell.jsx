import { formatLocalDateTime } from "../../lib/localDate.js";
import { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarDays,
  CheckCheck,
  CreditCard,
  ShieldCheck,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from "../../state/notificationsApi.js";
import { useNotificationScope } from "./NotificationSession.jsx";
import "../../assets/css/notifications.css";

const PREFIX = {
  customer: "/customer",
  chef: "/chef",
  manager: "/manager",
  admin: "/admin",
};
const CATEGORY_ICONS = {
  ORDER: UtensilsCrossed,
  RESERVATION: CalendarDays,
  PAYMENT: CreditCard,
  REVIEW: Star,
  STAFF: Users,
  APPROVAL: ShieldCheck,
  SYSTEM: Bell,
};
const categoryLabel = (category) => {
  const value = String(category || "SYSTEM").toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const pathFor = (item, role) => {
  const prefix = PREFIX[role];
  const path = item.action_url;
  return typeof path === "string" && path.startsWith(`${prefix}/`)
    ? path
    : prefix;
};
const ago = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationBell({ role, enabled = true }) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("unread");
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const panelId = useId();
  const navigate = useNavigate();
  const scope = useNotificationScope();
  const skip = !enabled || !scope;
  const list = useGetNotificationsQuery(
    { scope, unread: filter === "unread" },
    { skip },
  );
  const unread = useGetUnreadCountQuery(scope, { skip });
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: marking }] = useMarkAllReadMutation();
  const items = list.currentData?.items?.slice(0, 8) || [];
  const count = unread.currentData?.count || 0;
  const loading = list.isFetching || unread.isFetching;
  const error = actionError || list.error?.message || unread.error?.message;

  function refresh() {
    if (skip) return;
    setActionError("");
    list.refetch();
    unread.refetch();
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function markAll() {
    setActionError("");
    try {
      await markAllRead(scope).unwrap();
    } catch (e) {
      setActionError(e.message);
    }
  }
  async function openItem(item) {
    setActionError("");
    try {
      if (!item.is_read) await markRead({ scope, id: item.id }).unwrap();
    } catch (e) {
      setActionError(e.message);
    }
    setOpen(false);
    navigate(pathFor(item, role));
  }
  if (!enabled) return null;
  return (
    <div className="db-notification-wrap" ref={wrapRef}>
      <button
        type="button"
        className="db-notification-bell"
        ref={bellRef}
        aria-controls={open ? panelId : undefined}
        aria-label={`Notifications, ${count} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="db-notification-count">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <section
          id={panelId}
          className="db-notification-popover"
          aria-label="Recent notifications"
        >
          <header>
            <span className="db-notification-header-icon">
              <Bell size={22} />
            </span>
            <div>
              <strong>Notifications</strong>
              <small>
                {count
                  ? `${count} unread notification${count === 1 ? "" : "s"}`
                  : "No unread notifications"}
              </small>
            </div>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => {
                setOpen(false);
                bellRef.current?.focus();
              }}
            >
              <X size={19} />
            </button>
          </header>
          <div className="db-notification-toolbar">
            <div
              className="db-notification-tabs"
              role="group"
              aria-label="Filter notifications"
            >
              <button
                type="button"
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Unread <span>{count > 99 ? "99+" : count}</span>
              </button>
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </button>
            </div>
            <button
              type="button"
              className="db-notification-mark-all"
              onClick={markAll}
              disabled={!count || marking}
              aria-label="Mark all as read"
              title="Mark all as read"
            >
              <CheckCheck size={18} />
            </button>
          </div>
          {error && (
            <p className="db-notification-error" role="alert">
              {error}{" "}
              <button type="button" onClick={refresh}>
                Retry
              </button>
            </p>
          )}
          <div
            className="db-notification-list"
            aria-live="polite"
            aria-busy={loading}
          >
            {loading ? (
              <div
                className="db-notification-skeletons"
                role="status"
                aria-label="Loading notifications"
              >
                <div />
                <div />
                <div />
              </div>
            ) : items.length ? (
              items.map((item) => {
                const category = String(
                  item.category || "SYSTEM",
                ).toUpperCase();
                const Icon = CATEGORY_ICONS[category] || Bell;
                const timestamp = ago(item.created_at);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`db-notification-item${item.is_read ? "" : " unread"}`}
                    onClick={() => openItem(item)}
                  >
                    <span
                      className={`db-notification-icon ${category.toLowerCase()}`}
                      aria-hidden="true"
                    >
                      <Icon size={18} />
                    </span>
                    <span className="db-notification-copy">
                      <strong>{item.title}</strong>
                      <span className="db-notification-message">
                        {item.message}
                      </span>
                      <small className="db-notification-meta">
                        <span>{categoryLabel(category)}</span>
                        {timestamp && (
                          <>
                            <span aria-hidden="true">·</span>
                            <time
                              dateTime={item.created_at}
                              title={formatLocalDateTime(item.created_at, { timeStyle: "medium" })}
                            >
                              {timestamp}
                            </time>
                          </>
                        )}
                        {!item.is_read && (
                          <span className="db-notification-unread-label">
                            Unread
                          </span>
                        )}
                      </small>
                    </span>
                    {!item.is_read && (
                      <i className="db-unread-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            ) : (
              !error && (
                <div className="db-notification-empty">
                  <BellOff size={40} strokeWidth={1.4} />
                  <strong>
                    {filter === "unread"
                      ? "You’re all caught up"
                      : "No notifications yet"}
                  </strong>
                  <span>
                    {filter === "unread"
                      ? "No unread notifications found."
                      : "Your latest updates will appear here."}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
