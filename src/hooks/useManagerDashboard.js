import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeEvents } from "../lib/useRealtimeEvents.js";
import { getManagerDashboard, managerDashboardKeys } from "../features/manager/api/managerDashboardApi.js";

export default function useManagerDashboard(params, valid = true) {
  const query = useQuery({
    queryKey: managerDashboardKeys.detail(params),
    queryFn: () => getManagerDashboard(params),
    enabled: valid,
  });
  const timer = useRef(null);
  const queueRefresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") query.refetch();
    }, 600);
  }, [query.refetch]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useRealtimeEvents({ enabled: valid, onReady: () => {}, onReconnect: queueRefresh,
    onEvent: (event) => {
      if (["order.status_changed", "booking.updated", "payment.status_changed"].includes(event.event_type)) queueRefresh();
    },
  });
  return { data: query.data ?? null, loading: query.isLoading, error: query.error?.message || "", refresh: query.refetch };
}
