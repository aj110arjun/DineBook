import test from "node:test";
import assert from "node:assert/strict";
import {
  formatLocalDate,
  formatLocalDateTime,
  formatTimeAgo,
  shiftLocalMonth,
} from "./localDate.js";

test("calendar dates keep their day and use two-digit days and months", () => {
  assert.equal(formatLocalDate("2026-02-03"), "03/02/2026");
  assert.equal(formatLocalDate("2024-02-29"), "29/02/2024");
  assert.equal(formatLocalDateTime("2026-02-03"), "03/02/2026");
});

test("timestamps use the local calendar day and local clock", () => {
  const date = new Date(2026, 1, 3, 0, 5, 27);
  const instant = date.toISOString();
  const timeOptions = { timeStyle: "medium", hour12: false };
  assert.equal(formatLocalDate(instant), "03/02/2026");
  assert.equal(
    formatLocalDateTime(instant, timeOptions),
    "03/02/2026, " + date.toLocaleTimeString(undefined, timeOptions),
  );
});

test("missing and invalid timestamps have a fallback", () => {
  assert.equal(formatLocalDate(undefined), "—");
  assert.equal(formatLocalDateTime(null), "—");
  assert.equal(formatLocalDateTime("invalid"), "—");
});

test("relative timestamps cover recent, minute, hour, day, future, and invalid values", () => {
  const now = Date.parse("2026-11-26T02:30:00Z");
  assert.equal(formatTimeAgo("2026-11-26T02:29:30Z", { now }), "Just now");
  assert.equal(formatTimeAgo("2026-11-26T02:28:00Z", { now }), "2 min ago");
  assert.equal(formatTimeAgo("2026-11-26T01:30:00Z", { now }), "1 hour ago");
  assert.equal(formatTimeAgo("2026-11-25T02:30:00Z", { now }), "1 day ago");
  assert.equal(formatTimeAgo("2026-11-27T02:30:00Z", { now }), "Just now");
  assert.equal(formatTimeAgo("invalid", { now }), "");
  assert.equal(formatTimeAgo("2026-11-26T02:28:00Z", { compact: true, now }), "2m ago");
});

test("month navigation stores a timestamp for the first local day of the month", () => {
  const current = new Date(2026, 11, 31, 23);
  assert.equal(shiftLocalMonth(current), new Date(2026, 11, 1).getTime());
  assert.equal(shiftLocalMonth(current, 1), new Date(2027, 0, 1).getTime());
});
