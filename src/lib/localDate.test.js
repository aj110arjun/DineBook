import test from "node:test";
import assert from "node:assert/strict";
import { formatLocalDate, formatLocalDateTime } from "./localDate.js";

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
