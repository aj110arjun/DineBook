import { requestJson } from "../../../lib/authApi.js";

export const managerDashboardKeys = {
  all: ["dashboard", "manager"],
  detail: (filters = {}) => [...managerDashboardKeys.all, filters],
};

export function getManagerDashboard(filters) {
  return requestJson(`/api/manager/dashboard?${new URLSearchParams(filters)}`);
}
