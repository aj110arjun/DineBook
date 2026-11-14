import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardLoader, presetPeriod, validatePeriod } from "./managerDashboard.js";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test("admin resources share cancellation and coalesce duplicate in-flight refreshes", async () => {
  const requests = [], states = [];
  const loader = createDashboardLoader((url, options) => { const response = deferred(); requests.push({ url, options, ...response }); return response.promise; }, (s) => states.push(s), "/api/admin/dashboard/overview");
  const params = { start_date: "2026-11-01", end_date: "2026-11-14", group_by: "day" };
  const first = loader.load(params);
  assert.equal(loader.load(params), first);
  await Promise.resolve();
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /^\/api\/admin\/dashboard\/overview\?/);
  const second = loader.load({ ...params, end_date: "2026-11-15" });
  await Promise.resolve();
  assert.equal(requests[0].options.signal.aborted, true);
  requests[0].resolve({ stale: true });
  requests[1].resolve({ current: true });
  await Promise.all([first, second]);
  assert.deepEqual(states.at(-1).data, { current: true });
  assert.ok(loader.lastLoaded > 0);
  loader.cancel();
});

test("admin failures clear stale financial values and can be retried", async () => {
  const states = [];
  let fail = true;
  const loader = createDashboardLoader(async () => { if (fail) throw new Error("Analytics unavailable"); return { kpis: {} }; }, (s) => states.push(s), "/api/admin/dashboard/payments");
  await loader.load({});
  assert.deepEqual(states.at(-1), { data: null, loading: false, error: "Analytics unavailable" });
  fail = false;
  await loader.load({});
  assert.equal(states.at(-1).error, "");
  assert.deepEqual(states.at(-1).data, { kpis: {} });
});

test("admin dates reuse India timezone presets and bounded custom validation", () => {
  assert.deepEqual(presetPeriod("today", new Date("2026-11-13T18:31:00Z")), { start_date: "2026-11-14", end_date: "2026-11-14" });
  assert.equal(validatePeriod("2026-11-01", "2026-11-14"), "");
  assert.ok(validatePeriod("2026-11-14", "2026-11-01"));
  assert.ok(validatePeriod("2024-01-01", "2026-11-14", "day"));
});
