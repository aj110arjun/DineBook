import { requestJson } from "../../../lib/authApi.js";

export const chefDashboardKeys = {
  all: ["dashboard", "chef"],
  detail: (filters = {}) => [...chefDashboardKeys.all, filters],
};

export function getChefDashboard(filters) {
  return requestJson(`/api/chef/dashboard?${new URLSearchParams(filters)}`);
}
