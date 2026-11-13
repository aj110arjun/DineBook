import test from "node:test";
import assert from "node:assert/strict";
import { createChefDashboardLoader, createKitchenActions, elapsedLabel, kitchenInstant, preparationLabel } from "./chefDashboard.js";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const params = { period: "today", status: "ACTIVE", page: 1, page_size: 8 };

test("preparation and age labels preserve missing measurements and true zeros", () => {
  assert.equal(preparationLabel(null), "Unavailable");
  assert.equal(preparationLabel(0), "0 min");
  assert.equal(preparationLabel(15.25), "15.3 min");
  assert.equal(elapsedLabel(null), "No active orders");
  assert.equal(elapsedLabel(-5), "Less than 1 min");
  assert.equal(elapsedLabel(3660), "1 hr 1 min");
  assert.match(kitchenInstant("2026-11-12T18:30:00Z", "Asia/Kolkata", true), /13 Nov/);
});

test("refresh requests coalesce and use server filters and bounded pagination", async () => {
  const response = deferred(), states = [], requests = [];
  const loader = createChefDashboardLoader((...args) => { requests.push(args); return response.promise; }, (state) => states.push(state));
  const first = loader.load(params);
  assert.equal(loader.load(params), first);
  await Promise.resolve();
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], "/api/chef/dashboard?period=today&status=ACTIVE&page=1&page_size=8");
  assert.equal(states[0].loading, true);
  response.resolve({ summary: { today_orders: 23 } });
  await first;
  assert.equal(states.at(-1).data.summary.today_orders, 23);
  assert.equal(states.at(-1).loading, false);
  assert.ok(loader.lastLoaded > 0);
});

test("filter changes abort old requests and prevent stale responses overwriting data", async () => {
  const requests = [], states = [];
  const loader = createChefDashboardLoader((url, options) => {
    const response = deferred(); requests.push({ ...response, options }); return response.promise;
  }, (state) => states.push(state));
  const first = loader.load(params);
  await Promise.resolve();
  const second = loader.load({ ...params, status: "READY", period: "last7", page: 2 });
  await Promise.resolve();
  assert.equal(requests[0].options.signal.aborted, true);
  requests[1].resolve({ marker: "filtered" }); await second;
  requests[0].resolve({ marker: "stale" }); await first;
  assert.equal(states.at(-1).data.marker, "filtered");
  assert.equal(states.filter((state) => state.data?.marker === "stale").length, 0);
});

test("transient refresh errors keep visibly stale data; authorization errors clear it", async () => {
  const states = [];
  let error = null;
  const loader = createChefDashboardLoader(async () => { if (error) throw error; return { marker: "live" }; }, (state) => states.push(state));
  await loader.load(params);
  error = new Error("Service unavailable"); await loader.load(params);
  assert.equal(states.at(-1).data.marker, "live");
  assert.equal(states.at(-1).error, "Service unavailable");
  error.status = 401; await loader.load(params);
  assert.equal(states.at(-1).data, null);
});

test("unmount cancellation stops pending work from publishing", async () => {
  const response = deferred(), states = [];
  const loader = createChefDashboardLoader(() => response.promise, (state) => states.push(state));
  const request = loader.load(params); await Promise.resolve(); loader.cancel();
  response.resolve({ marker: "unmounted" }); await request;
  assert.equal(states.length, 1);
});

test("successful mutations can force a fresh read instead of joining a pre-mutation request", async () => {
  const requests = [];
  const loader = createChefDashboardLoader((url, options) => {
    const response = deferred(); requests.push({ ...response, signal: options.signal }); return response.promise;
  }, () => {});
  const previous = loader.load(params); await Promise.resolve();
  const latest = loader.load(params, { force: true }); await Promise.resolve();
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve({ status: "READY" });
  assert.equal((await latest).status, "READY");
  requests[0].resolve({ status: "PREPARING" });
  assert.equal(await previous, null);
});

const order = { id: "01234567-1234-1234-1234-012345678900", allowed_actions: ["READY"] };
function actionHarness(overrides = {}) {
  const calls = [], busy = [], notices = [];
  let refreshCount = 0, confirmCount = 0;
  const action = createKitchenActions({ request: async (...args) => { calls.push(args); },
    refresh: async () => { refreshCount += 1; }, confirm: async () => { confirmCount += 1; return true; },
    onBusy: (...args) => busy.push(args), onNotice: (notice) => notices.push(notice), ...overrides });
  return { action, calls, busy, notices, get refreshCount() { return refreshCount; }, get confirmCount() { return confirmCount; } };
}

test("ready action confirms once, prevents duplicates, patches the existing API, then refreshes", async () => {
  const gate = deferred();
  const harness = actionHarness({ confirm: () => gate.promise });
  const first = harness.action(order, "READY");
  assert.equal(harness.action(order, "READY"), first);
  assert.deepEqual(harness.busy, [[order.id, true]]);
  gate.resolve(true); assert.equal(await first, true);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0][0], `/api/chef/orders/${order.id}/status`);
  assert.deepEqual(harness.calls[0][1], { method: "PATCH", body: { status: "READY" }, timeout: 15000 });
  assert.equal(harness.refreshCount, 1);
  assert.deepEqual(harness.busy.at(-1), [order.id, false]);
});

test("cancelling confirmation and unsupported actions do not mutate", async () => {
  const harness = actionHarness({ confirm: async () => false });
  assert.equal(await harness.action(order, "READY"), false);
  assert.equal(await harness.action(order, "COMPLETED"), false);
  assert.equal(await harness.action({ ...order, allowed_actions: [] }, "ACCEPTED"), false);
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.refreshCount, 0);
  assert.deepEqual(harness.busy.at(-1), [order.id, false]);
});

test("stale transition conflicts show the backend error and reconcile the queue", async () => {
  const error = Object.assign(new Error("Order cannot move from READY to READY."), { status: 409 });
  const harness = actionHarness({ request: async () => { throw error; } });
  assert.equal(await harness.action(order, "READY"), false);
  assert.equal(harness.notices.at(-1).error, true);
  assert.equal(harness.notices.at(-1).message, error.message);
  assert.equal(harness.refreshCount, 1);
});

test("starting preparation uses server permission without an extra confirmation", async () => {
  const harness = actionHarness();
  assert.equal(await harness.action({ ...order, allowed_actions: ["PREPARING"] }, "PREPARING"), true);
  assert.equal(harness.confirmCount, 0);
  assert.equal(harness.refreshCount, 1);
});
