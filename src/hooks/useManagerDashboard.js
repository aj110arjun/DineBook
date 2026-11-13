import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePageState } from "../state/usePageState.js";
import { requestJson } from "../lib/authApi.js";
import { useRealtimeEvents } from "../lib/useRealtimeEvents.js";
import { createDashboardLoader } from "../lib/managerDashboard.js";

export default function useManagerDashboard(params, valid = true) {
  const [state, setters] = usePageState("ManagerDashboardData", () => ({ data: null, loading: true, error: "" }));
  const loader = useMemo(() => createDashboardLoader(requestJson, (next) => {
    setters.data(next.data);
    setters.loading(next.loading);
    setters.error(next.error);
  }), [setters]);
  const latest = useRef({ params, valid });
  latest.current = { params, valid };
  const refresh = useCallback(() => {
    if (latest.current.valid) return loader.load(latest.current.params);
  }, [loader]);

  useEffect(() => {
    if (valid) loader.load(params);
    return () => loader.cancel();
  }, [loader, params, valid]);

  useEffect(() => {
    const onActive = () => {
      if (document.visibilityState === "visible" && Date.now() - loader.lastLoaded > 30000) refresh();
    };
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [loader, refresh]);

  const timer = useRef(null);
  const queueRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") refresh();
    }, 600);
  }, [refresh]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useRealtimeEvents({
    onEvent: (event) => {
      if (["order.status_changed", "booking.updated", "payment.status_changed"].includes(event.event_type)) queueRefresh();
    },
    onReady: () => {},
    onReconnect: queueRefresh,
  });
  return { ...state, refresh };
}
