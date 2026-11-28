import { requestJson } from "../../../lib/authApi.js";

export const adminDashboardKeys = {
  all: ["dashboard", "admin"],
  resource: (resource, filters = {}) => [...adminDashboardKeys.all, resource, filters],
};

export function getAdminDashboard(resource, filters) {
  return requestJson(`/api/admin/dashboard/${resource}?${new URLSearchParams(filters)}`);
}
