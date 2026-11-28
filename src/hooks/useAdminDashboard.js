import { useQuery } from "@tanstack/react-query";
import { adminDashboardKeys, getAdminDashboard } from "../features/admin/api/adminDashboardApi.js";

// Reuse request cancellation/coalescing from the manager portal. Each resource
// has independent feedback so a failed activity list cannot hide the KPIs.
export default function useAdminDashboard(resource, params, valid = true) {
  const filters = Object.fromEntries(Object.entries(params || {}).filter(([, value]) => value != null && value !== ""));
  const query = useQuery({
    queryKey: adminDashboardKeys.resource(resource, filters),
    queryFn: () => getAdminDashboard(resource, filters),
    enabled: valid,
  });
  return { data: query.data ?? null, loading: query.isLoading, error: query.error?.message || "", refresh: query.refetch };
}
