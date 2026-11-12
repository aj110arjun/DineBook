import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./authApi.js";

const REALTIME_EVENT_TYPES = [
  "order.status_changed",
  "booking.updated",
  "payment.status_changed",
  "wallet.transfer_sent",
  "wallet.transfer_received",
  "notification.created",
];

const subscribers = new Set();

let source = null;
let reconnectTimer = null;
let cursor = "";
let connectionStatus = "disconnected";
let connectionReady = false;
let hasBeenReady = false;
let authExpired = false;
let retryMs = 1000;

function invoke(callback, ...args) {
  try {
    Promise.resolve(callback?.(...args)).catch(() => {});
  } catch {
    // A subscriber failure must not interrupt other subscribers.
  }
}

function publishStatus(status) {
  connectionStatus = status;

  subscribers.forEach((subscriber) => {
    subscriber.onStatus(status);
  });
}

function stopConnection() {
  window.clearTimeout(reconnectTimer);
  reconnectTimer = null;

  source?.close();
  source = null;

  cursor = "";
  connectionReady = false;
  hasBeenReady = false;
  authExpired = false;
  retryMs = 1000;
  connectionStatus = "disconnected";
}

function connect() {
  if (source || authExpired || subscribers.size === 0) {
    return;
  }

  publishStatus(hasBeenReady ? "reconnecting" : "connecting");

  const url = new URL(`${API_BASE}/api/events/stream`, window.location.href);

  if (cursor !== "") {
    url.searchParams.set("after", cursor);
  }

  const connection = new EventSource(url.toString(), { withCredentials: true });

  source = connection;

  connection.addEventListener("stream.ready", (message) => {
    if (source !== connection) return;

    if (message.lastEventId) {
      cursor = message.lastEventId;
    }

    const reconnected = hasBeenReady;

    connectionReady = true;
    hasBeenReady = true;
    retryMs = 1000;

    publishStatus("connected");

    subscribers.forEach((subscriber) => {
      subscriber.onReady(reconnected);
    });
  });

  const receive = (message) => {
    if (source !== connection) return;

    if (message.lastEventId) {
      cursor = message.lastEventId;
    }

    let event;

    try {
      event = JSON.parse(message.data);
    } catch {
      return;
    }

    subscribers.forEach((subscriber) => {
      subscriber.onEvent(event);
    });
  };

  REALTIME_EVENT_TYPES.forEach((type) => {
    connection.addEventListener(type, receive);
  });

  connection.addEventListener("auth.expired", () => {
    if (source !== connection) return;

    authExpired = true;
    connectionReady = false;

    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;

    connection.close();
    source = null;

    publishStatus("disconnected");
  });

  connection.onerror = () => {
    if (source !== connection || authExpired) return;

    connection.close();
    source = null;
    connectionReady = false;

    if (subscribers.size === 0) return;

    publishStatus("reconnecting");

    window.clearTimeout(reconnectTimer);

    const jitter = Math.floor(Math.random() * Math.max(250, retryMs * 0.25));

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, retryMs + jitter);

    retryMs = Math.min(retryMs * 2, 30000);
  };
}

export function useRealtimeEvents({
  enabled = true,
  onEvent,
  onReconnect,
  onReady,
} = {}) {
  const callbacks = useRef({
    onEvent,
    onReconnect,
    onReady,
  });

  const [status, setStatus] = useState(
    enabled ? connectionStatus : "disconnected",
  );

  useEffect(() => {
    callbacks.current = {
      onEvent,
      onReconnect,
      onReady,
    };
  }, [onEvent, onReconnect, onReady]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return undefined;
    }

    const subscriber = {
      onStatus: setStatus,

      onEvent(event) {
        invoke(callbacks.current.onEvent, event);
      },

      onReady(reconnected) {
        const current = callbacks.current;

        // Existing consumers can keep using onReconnect.
        const callback = reconnected
          ? current.onReconnect
          : (current.onReady ?? current.onReconnect);

        invoke(callback);
      },
    };

    subscribers.add(subscriber);
    setStatus(connectionStatus);

    if (connectionReady) {
      subscriber.onReady(false);
    } else {
      connect();
    }

    return () => {
      subscribers.delete(subscriber);

      if (subscribers.size === 0) {
        stopConnection();
      }
    };
  }, [enabled]);

  return status;
}
