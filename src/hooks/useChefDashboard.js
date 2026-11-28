import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeEvents } from "../lib/useRealtimeEvents.js";
import { chefDashboardKeys, getChefDashboard } from "../features/chef/api/chefDashboardApi.js";

export default function useChefDashboard(params, enabled) {
  const query = useQuery({
    queryKey: chefDashboardKeys.detail(params),
    queryFn: () => getChefDashboard(params),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
  const timer = useRef(null);
  const queueRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") query.refetch();
    }, 500);
  }, [query.refetch]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const connection = useRealtimeEvents({ enabled, onReady: queueRefresh, onReconnect: queueRefresh,
    onEvent: (event) => {
      if (["order.status_changed", "booking.updated"].includes(event.event_type)) queueRefresh();
    },
  });
  return { data: query.data ?? null, loading: query.isLoading, error: query.error?.message || "", refresh: query.refetch, connection };
}
