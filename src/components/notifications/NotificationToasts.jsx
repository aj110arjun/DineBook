import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { createNotificationDelivery } from "../../lib/notificationDelivery.js";
import { notificationTags, notificationsApi } from "../../state/notificationsApi.js";
import { clearToasts, dismissToast, enqueueToast } from "../../state/notificationToasts.js";
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

export default function NotificationToasts({ scope }) {
  const dispatch = useDispatch();
  const item = useSelector((state) => state.notificationToasts[scope]?.[0]);
  const sessionRef = useRef(null);
  const refreshTimer = useRef(null);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      dispatch(notificationsApi.util.invalidateTags(notificationTags(scope)));
    }, 400);
  }, [dispatch, scope]);

  useEffect(() => {
    async function fetchNotification(endpoint, args, signal) {
      const query = dispatch(endpoint.initiate(args, {
        subscribe: false,
        forceRefetch: true,
      }));
      const abort = () => query.abort();
      signal.addEventListener("abort", abort, { once: true });
      try {
        return await query.unwrap();
      } finally {
        signal.removeEventListener("abort", abort);
      }
    }

    const session = createNotificationDelivery({
      loadRecent: (signal) => fetchNotification(
        notificationsApi.endpoints.getNotifications, { scope, unread: false }, signal,
      ),
      loadNotification: (id, signal) => fetchNotification(
        notificationsApi.endpoints.getNotification, { scope, id }, signal,
      ),
      onNotification: (notification) => {
        dispatch(enqueueToast({ scope, item: notification }));
        scheduleRefresh();
      },
    });
    sessionRef.current = session;
    return () => {
      window.clearTimeout(refreshTimer.current);
      session.dispose();
      sessionRef.current = null;
      dispatch(clearToasts(scope));
      dispatch(notificationsApi.util.resetApiState());
    };
  }, [dispatch, scope, scheduleRefresh]);

  const realtimeStatus = useRealtimeEvents({
    onEvent: (event) => {
      if (event?.event_type !== "notification.created") return;
      scheduleRefresh();
      return sessionRef.current?.receive(event.resource_id);
    },
    onReady: () => sessionRef.current?.refresh(),
    onReconnect: () => {
      scheduleRefresh();
      return sessionRef.current?.refresh();
    },
  });

  useEffect(() => {
    // Poll only while live delivery is unavailable or a request needs recovery.
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
    dispatch(dismissToast({ scope, id }));
  }, [dispatch, scope]);

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
