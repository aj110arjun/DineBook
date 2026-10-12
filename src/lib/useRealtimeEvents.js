import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./authApi.js";

const REALTIME_EVENT_TYPES = [
  "order.status_changed",
  "booking.updated",
  "payment.status_changed",
];

/** Cookie-authenticated SSE client with cursor recovery and jittered reconnects. */
export function useRealtimeEvents({
  enabled = true,
  onEvent,
  onReconnect,
} = {}) {
  const callbacks = useRef({ onEvent, onReconnect });
  const cursor = useRef("");
  const [status, setStatus] = useState(enabled ? "connecting" : "disconnected");

  useEffect(() => {
    callbacks.current = { onEvent, onReconnect };
  }, [onEvent, onReconnect]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return undefined;
    }

    let source;
    let timer;
    let stopped = false;
    let authExpired = false;
    let hasConnected = false;
    let retryMs = 1000;

    const connect = () => {
      if (stopped) return;
      const url = new URL(
        `${API_BASE}/api/events/stream`,
        window.location.href,
      );
      if (cursor.current) url.searchParams.set("after", cursor.current);
      source = new EventSource(url.toString(), { withCredentials: true });
      source.onopen = () => {
        const reconnected = hasConnected;
        hasConnected = true;
        retryMs = 1000;
        setStatus("connected");
        if (reconnected) callbacks.current.onReconnect?.();
      };
      const receive = (message) => {
        if (message.lastEventId) cursor.current = message.lastEventId;
        try {
          callbacks.current.onEvent?.(JSON.parse(message.data));
        } catch {
          // Ignore malformed event data; the next reconciliation reloads source state.
        }
      };
      REALTIME_EVENT_TYPES.forEach((type) =>
        source.addEventListener(type, receive),
      );
      source.addEventListener("auth.expired", () => {
        authExpired = true;
        source.close();
        setStatus("disconnected");
      });
      source.onerror = () => {
        if (stopped || authExpired) return;
        setStatus("reconnecting");
        source.close();
        const jitter = Math.floor(
          Math.random() * Math.max(250, retryMs * 0.25),
        );
        timer = window.setTimeout(connect, retryMs + jitter);
        retryMs = Math.min(retryMs * 2, 30000);
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      source?.close();
    };
  }, [enabled]);

  return status;
}
