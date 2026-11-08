import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "../../assets/css/notifications.css";

const TOAST_DURATION = 7000;

function NotificationToast({ item, onDismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [focused, hovered, item.id, onDismiss]);

  return (
    <div
      className="db-notification-toast"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="db-notification-header-icon" aria-hidden="true">
        <Bell size={20} />
      </span>
      <div className="db-notification-copy">
        <strong>{item.title}</strong>
        <span className="db-notification-message">{item.message}</span>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification toast"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => onDismiss(item.id)}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CustomerNotificationToasts() {
  const [queue, setQueue] = useState([]);
  const sessionRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    sessionRef.current = { controller, seenIds: new Set() };
    return () => {
      controller.abort();
      sessionRef.current = null;
    };
  }, []);

  useRealtimeEvents({
    onEvent: async (event) => {
      if (event?.event_type !== "notification.created") return;
      const id = event.resource_id;
      const session = sessionRef.current;
      if (!id || !session || session.seenIds.has(id)) return;

      session.seenIds.add(id);
      const { signal } = session.controller;
      try {
        const item = await requestJson(
          `/api/notifications/${encodeURIComponent(id)}`,
          { signal },
        );
        if (!signal.aborted) setQueue((current) => [...current, item]);
      } catch {
        // Let a replay retry this item. The bell still refreshes independently.
        session.seenIds.delete(id);
      }
    },
  });

  const dismiss = useCallback((id) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);
  const item = queue[0];

  return createPortal(
    <div
      className="db-notification-toasts"
      aria-live="polite"
      aria-relevant="additions"
    >
      {item && (
        <NotificationToast key={item.id} item={item} onDismiss={dismiss} />
      )}
    </div>,
    document.body,
  );
}
