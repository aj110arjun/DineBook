import test from "node:test";
import assert from "node:assert/strict";
import { businessDate, comparison, createDashboardLoader, donutGradient, formatBucket, formatCurrency, formatDate, formatInstant, presetPeriod, validatePeriod } from "./managerDashboard.js";

const instant = new Date("2026-11-12T19:00:00Z");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test("presets use the restaurant date and inclusive day ranges", () => {
  assert.equal(businessDate(instant), "2026-11-13");
  assert.deepEqual(presetPeriod("today", instant), { start_date: "2026-11-13", end_date: "2026-11-13" });
  assert.deepEqual(presetPeriod("last7", instant), { start_date: "2026-11-07", end_date: "2026-11-13" });
  assert.deepEqual(presetPeriod("last30", instant), { start_date: "2026-10-15", end_date: "2026-11-13" });
  assert.equal(presetPeriod("month", instant).start_date, "2026-11-01");
  assert.equal(presetPeriod("year", instant).start_date, "2026-01-01");
});

test("custom dates reject missing, impossible, reversed and excessive ranges", () => {
  assert.match(validatePeriod("", "2026-11-13"), /valid/);
  assert.match(validatePeriod("2026-02-30", "2026-11-13"), /valid/);
  assert.match(validatePeriod("2026-11-13", "2026-11-01"), /end date/);
  assert.match(validatePeriod("2000-01-01", "2026-11-13"), /3660/);
  assert.match(validatePeriod("2024-01-01", "2026-11-13", "day"), /larger/);
  assert.equal(validatePeriod("2024-02-29", "2024-03-01"), "");
});

test("currency, calendar and grouping labels stay consistent", () => {
  assert.equal(formatCurrency("123456.50"), "₹1,23,456.50");
  assert.equal(formatCurrency("-50"), "-₹50.00");
  assert.match(formatDate("2026-11-13"), /13 Nov 2026/);
  assert.equal(formatBucket("2026-11-01", "year"), "2026");
  assert.match(formatBucket("2026-11-02", "week"), /Week of/);
  assert.equal(formatInstant("2026-11-12T19:00:00"), formatInstant("2026-11-12T19:00:00Z"));
  assert.equal(comparison({ change_percent: null }), "No previous baseline");
  assert.equal(comparison({ change_percent: "-12.50" }), "-12.5%");
});

test("status donut uses real proportions and does not invent zero segments", () => {
  assert.equal(donutGradient([]), "none");
  assert.equal(donutGradient([{ value: 0 }]), "none");
  assert.equal(donutGradient([{ value: 1, color: "red" }, { value: 3, color: "blue" }]), "conic-gradient(red 0% 25%, blue 25% 100%)");
});

test("dashboard requests real data, coalesces overlapping refreshes and permits manual reload", async () => {
  const pending = deferred();
  const calls = [], states = [];
  const loader = createDashboardLoader((...args) => { calls.push(args); return pending.promise; }, (state) => states.push(state));
  const params = { start_date: "2026-11-01", end_date: "2026-11-13", group_by: "week", popular_sort: "revenue" };
  const first = loader.load(params);
  assert.equal(loader.load(params), first);
  await tick();
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /\/api\/manager\/dashboard\/overview\?start_date=2026-11-01&end_date=2026-11-13&group_by=week&popular_sort=revenue/);
  assert.equal(states[0].loading, true);
  const data = { revenue: { net: "890.50" } };
  pending.resolve(data);
  await first;
  assert.deepEqual(states.at(-1), { data, loading: false, error: "" });
  assert.ok(loader.lastLoaded > 0);
  await loader.load(params);
  assert.equal(calls.length, 2);
});

test("rapid filter changes abort old requests and cannot overwrite current data", async () => {
  const calls = [], states = [];
  const loader = createDashboardLoader((url, options) => { const request = deferred(); calls.push({ url, options, ...request }); return request.promise; }, (state) => states.push(state));
  const old = loader.load({ start_date: "2026-01-01" });
  await tick();
  const current = loader.load({ start_date: "2026-11-01" });
  await tick();
  assert.equal(calls[0].options.signal.aborted, true);
  calls[1].resolve({ id: "current" });
  await current;
  calls[0].resolve({ id: "old" });
  await old;
  assert.equal(states.at(-1).data.id, "current");
});

test("API failure clears data and retry recovers without a mock fallback", async () => {
  const states = [];
  let fail = true;
  const loader = createDashboardLoader(async () => { if (fail) throw new Error("Unavailable"); return { real: true }; }, (state) => states.push(state));
  await loader.load({});
  assert.deepEqual(states.at(-1), { data: null, loading: false, error: "Unavailable" });
  fail = false;
  await loader.load({});
  assert.deepEqual(states.at(-1), { data: { real: true }, loading: false, error: "" });
});

test("unmount cancels pending data and suppresses later state changes", async () => {
  const pending = deferred(), states = [];
  let signal;
  const loader = createDashboardLoader((url, options) => { signal = options.signal; return pending.promise; }, (state) => states.push(state));
  const result = loader.load({});
  await tick();
  loader.cancel();
  assert.equal(signal.aborted, true);
  pending.resolve({ late: true });
  await result;
  assert.equal(states.length, 1);
});

test("manager display preferences format activity without changing business date filters", async () => {
  const { setAccountDateTimePreferences } = await import("./localDate.js");
  try {
    setAccountDateTimePreferences({ date_format: "YYYY-MM-DD", time_format: "24h", timezone: "America/Los_Angeles" });
    assert.equal(formatDate("2026-11-13"), "2026-11-13");
    assert.equal(formatInstant("2026-11-13T00:30:00Z"), "2026-11-12, 16:30");
    assert.equal(businessDate(new Date("2026-11-12T19:00:00Z")), "2026-11-13");
  } finally {
    setAccountDateTimePreferences(null);
  }
});
