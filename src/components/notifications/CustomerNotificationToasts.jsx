import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { createNotificationDelivery } from "../../lib/notificationDelivery.js";
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
    const session = createNotificationDelivery({
      request: requestJson,
      onNotification: (item) => setQueue((current) => [...current, item]),
    });
    sessionRef.current = session;
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, []);

  const realtimeStatus = useRealtimeEvents({
    onEvent: (event) => {
      if (event?.event_type !== "notification.created") return;
      return sessionRef.current?.receive(event.resource_id);
    },
    onReady: () => sessionRef.current?.refresh(),
    onReconnect: () => sessionRef.current?.refresh(),
  });

  useEffect(() => {
    // Poll only while live delivery is unavailable or a request needs recovery.
    // A successful top-up must still toast when SSE cannot connect.
    const recover = () => {
      const session = sessionRef.current;
      if (realtimeStatus !== "connected" || session?.needsRecovery()) {
        session?.refresh();
      }
    };
    recover();
    const timer = window.setInterval(recover, 5000);
    return () => window.clearInterval(timer);
  }, [realtimeStatus]);

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
