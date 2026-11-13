export const BUSINESS_TIMEZONE = "Asia/Kolkata";
export const PERIOD_PRESETS = [
  ["today", "Today"], ["last7", "Last 7 Days"], ["last30", "Last 30 Days"],
  ["month", "This Month"], ["year", "This Year"], ["custom", "Custom Range"],
];

export function businessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function presetPeriod(preset, now = new Date()) {
  const end = businessDate(now);
  const day = new Date(`${end}T00:00:00Z`);
  if (preset === "last7" || preset === "last30") day.setUTCDate(day.getUTCDate() - (preset === "last7" ? 6 : 29));
  if (preset === "month") day.setUTCDate(1);
  if (preset === "year") day.setUTCMonth(0, 1);
  return { start_date: day.toISOString().slice(0, 10), end_date: end };
}

export function validatePeriod(start, end, group = "auto") {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!validDate(start) || !validDate(end)) return "Choose a valid start and end date.";
  if (start > end) return "The end date must be on or after the start date.";
  if (start < "2000-01-01" || end > "2099-12-31") return "Choose dates between 2000 and 2099.";
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (days > 3660) return "Choose a range of at most 3660 days.";
  if (group === "day" && days > 366) return "Choose a larger chart interval for ranges over 366 days.";
  return "";
}

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const numbers = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
export const formatCurrency = (value) => currency.format(Number(value || 0));
export const formatNumber = (value) => numbers.format(Number(value || 0));
export const formatDate = (value) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
export const formatInstant = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TIMEZONE }).format(new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`));
export const statusLabel = (value) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export function formatBucket(value, group) {
  if (group === "year") return value.slice(0, 4);
  const label = new Intl.DateTimeFormat("en-IN", { month: "short", ...(group !== "month" ? { day: "numeric" } : { year: "2-digit" }), timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return group === "week" ? `Week of ${label}` : label;
}

export function comparison(metric) {
  if (metric.change_percent === null) return "No previous baseline";
  const value = Number(metric.change_percent);
  return `${value > 0 ? "+" : ""}${formatNumber(value)}%`;
}

export const STATUS_COLORS = {
  COMPLETED: "#2d8737", CONFIRMED: "#2675c9", SEATED: "#7952b3", READY: "#2675c9", SERVED: "#398d89",
  PREPARING: "#ef7917", ACCEPTED: "#a57b19", PLACED: "#858585", PENDING_PAYMENT: "#858585",
  CANCELLED: "#c44758", REJECTED: "#97314e", NO_SHOW: "#96755b",
};
export const SERIES_COLORS = ["#7c2d3c", "#2675c9", "#2d8737", "#ef7917", "#7952b3", "#398d89"];

export function donutGradient(items) {
  const total = items.reduce((sum, item) => sum + Number(item.value), 0);
  if (!total) return "none";
  let cursor = 0;
  return `conic-gradient(${items.map((item, index) => {
    const from = cursor;
    cursor += Number(item.value) / total * 100;
    return `${item.color || SERIES_COLORS[index % SERIES_COLORS.length]} ${from}% ${cursor}%`;
  }).join(", ")})`;
}

/** Latest request wins; same-query refreshes coalesce, and errors clear old data. */
export function createDashboardLoader(request, onState) {
  let sequence = 0;
  let pending = null;
  let lastLoaded = 0;
  const cancel = () => {
    sequence += 1;
    pending?.controller.abort();
    pending = null;
  };
  return {
    cancel,
    get lastLoaded() { return lastLoaded; },
    load(params) {
      const query = new URLSearchParams(params).toString();
      if (pending?.query === query) return pending.promise;
      cancel();
      const ticket = sequence;
      const controller = new AbortController();
      onState({ data: null, loading: true, error: "" });
      const promise = Promise.resolve().then(() => request(`/api/manager/dashboard/overview?${query}`, {
        signal: controller.signal, fallbackMessage: "The dashboard could not be loaded. Please try again.",
      })).then((data) => {
        if (ticket !== sequence) return;
        lastLoaded = Date.now();
        onState({ data, loading: false, error: "" });
      }).catch((error) => {
        if (ticket !== sequence) return;
        onState({ data: null, loading: false, error: error.message || "The dashboard could not be loaded." });
      }).finally(() => {
        if (ticket === sequence) pending = null;
      });
      pending = { query, promise, controller };
      return promise;
    },
  };
}
