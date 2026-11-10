const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatLocalDate(value) {
  if (value == null || value === "") return "—";

  // A calendar date has no timezone and should keep the same day everywhere.
  const calendarDate = typeof value === "string"
    ? calendarDatePattern.exec(value)
    : null;
  if (calendarDate) {
    const [, year, month, day] = calendarDate;
    return [day, month, year].join("/");
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatLocalDateTime(value, timeOptions = {}) {
  const dateLabel = formatLocalDate(value);
  if (
    dateLabel === "—" ||
    (typeof value === "string" && calendarDatePattern.test(value))
  ) {
    return dateLabel;
  }

  const time = new Date(value).toLocaleTimeString(undefined, {
    timeStyle: "short",
    ...timeOptions,
  });
  return dateLabel + ", " + time;
}
