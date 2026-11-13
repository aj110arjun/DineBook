const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
let customerPreferences = null;

function calendarParts(value) {
  if (typeof value !== "string") return null;
  const iso = calendarDatePattern.exec(value);
  if (iso) return iso.slice(1);
  // Existing reservation endpoints return e.g. "20 November 2026". This is
  // still a calendar date, not local midnight in the selected activity timezone.
  const legacy = /^(\d{1,2}) ([a-z]+) (\d{4})$/i.exec(value);
  const month = legacy ? months.indexOf(legacy[2].toLowerCase()) : -1;
  return month < 0 ? null : [legacy[3], String(month + 1).padStart(2, "0"), legacy[1].padStart(2, "0")];
}

export function setCustomerDateTimePreferences(preferences) {
  customerPreferences = preferences;
}

export const setAccountDateTimePreferences = setCustomerDateTimePreferences;
export const getAccountDateTimePreferences = () => customerPreferences;

export function parseTimestamp(value) {
  if (value == null || value === "") return new Date(NaN);
  // API datetimes are UTC. Older responses may omit the UTC suffix.
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value}Z` : value;
  return new Date(normalized);
}

function dateLabel(year, month, day, format) {
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return (format === "MM/DD/YYYY" ? [month, day, year] : [day, month, year]).join("/");
}

export function formatLocalDate(value, preferences = customerPreferences) {
  if (value == null || value === "") return "—";
  const calendarDate = calendarParts(value);
  if (calendarDate) {
    const [year, month, day] = calendarDate;
    const iso = `${year}-${month}-${day}`;
    const probe = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== iso) return "—";
    return dateLabel(year, month, day, preferences?.date_format);
  }
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", ...(preferences?.timezone ? { timeZone: preferences.timezone } : {}),
  }).formatToParts(date).map(({ type, value: part }) => [type, part]));
  return dateLabel(parts.year, parts.month, parts.day, preferences?.date_format);
}

export function formatCalendarDate(value, preferences = customerPreferences) {
  if (value instanceof Date || typeof value === "number") {
    const day = new Date(value);
    if (Number.isNaN(day.getTime())) return "—";
    value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  }
  return formatLocalDate(value, preferences);
}

export function formatLocalTime(value, timeOptions = {}, preferences = customerPreferences) {
  const date = parseTimestamp(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(preferences ? "en-US" : undefined, {
    timeStyle: "short", ...timeOptions,
    ...(preferences ? { hour12: preferences.time_format !== "24h" } : {}),
    ...(preferences?.timezone ? { timeZone: preferences.timezone } : {}),
  });
}

// Reservation times are restaurant wall-clock times, not UTC instants.
export function formatWallTime(value, preferences = customerPreferences) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value || "");
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return "—";
  const [, hour, minute] = match;
  if (preferences?.time_format === "24h") return `${hour}:${minute}`;
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? "PM" : "AM"}`;
}

export function formatLocalDateTime(value, timeOptions = {}, preferences = customerPreferences) {
  const label = formatLocalDate(value, preferences);
  if (label === "—" || calendarParts(value)) return label;
  return `${label}, ${formatLocalTime(value, timeOptions, preferences)}`;
}

export function shiftLocalMonth(value, offset = 0) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + offset, 1).getTime();
}
