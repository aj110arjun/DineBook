import { useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "../lib/authApi.js";
import { createDashboardLoader } from "../lib/managerDashboard.js";

// Reuse request cancellation/coalescing from the manager portal. Each resource
// has independent feedback so a failed activity list cannot hide the KPIs.
export default function useAdminDashboard(resource, params, valid = true) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const loader = useMemo(() => createDashboardLoader(requestJson, setState, `/api/admin/dashboard/${resource}`), [resource]);
  const query = new URLSearchParams(params).toString();
  const refresh = useCallback(() => valid ? loader.load(Object.fromEntries(new URLSearchParams(query))) : Promise.resolve(), [loader, query, valid]);
  useEffect(() => {
    refresh();
    return () => loader.cancel();
  }, [loader, refresh]);
  return { ...state, refresh };
}
