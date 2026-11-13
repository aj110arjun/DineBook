import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requestJson } from "../lib/authApi.js";
import { createChefDashboardLoader } from "../lib/chefDashboard.js";
import { useRealtimeEvents } from "../lib/useRealtimeEvents.js";

export default function useChefDashboard(params, enabled) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const mounted = useRef(false);
  const loader = useMemo(() => createChefDashboardLoader(requestJson, (next) => {
    if (mounted.current) setState(next);
  }), []);
  const latest = useRef({ params, enabled });
  latest.current = { params, enabled };
  const refresh = useCallback((force = false) => {
    if (latest.current.enabled) return loader.load(latest.current.params, { force: force === true });
    return Promise.resolve(null);
  }, [loader]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; loader.cancel(); };
  }, [loader]);
  useEffect(() => {
    if (enabled) loader.load(params);
    return () => loader.cancel();
  }, [params, enabled, loader]);

  const timer = useRef(null);
  const queueRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") refresh();
    }, 500);
  }, [refresh]);
  const seen = useRef(new Set());
  const connection = useRealtimeEvents({
    enabled,
    onReady: queueRefresh, onReconnect: queueRefresh,
    onEvent: (event) => {
      if (!["order.status_changed", "booking.updated"].includes(event.event_type)) return;
      if (event.event_id && seen.current.has(event.event_id)) return;
      if (event.event_id) {
        seen.current.add(event.event_id);
        if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value);
      }
      queueRefresh();
    },
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const onActive = () => {
      if (document.visibilityState === "visible" && Date.now() - loader.lastLoaded > 15000) refresh();
    };
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - loader.lastLoaded >= 25000) refresh();
    }, 30000);
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timer.current);
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [enabled, refresh, loader]);
  return { ...state, refresh, connection };
}
