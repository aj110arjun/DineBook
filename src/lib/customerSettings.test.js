import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerSettingsStore, DEFAULT_GENERAL, timezoneOptions, watchThemePreference } from "./customerSettings.js";
import { formatCalendarDate, formatLocalDate, formatLocalDateTime, formatWallTime, setCustomerDateTimePreferences } from "./localDate.js";

const defaults = () => ({ general: { ...DEFAULT_GENERAL }, notifications: { email_enabled: true, promotional_offers: false } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};

test("deduplicates concurrent loads and exposes retryable errors without invented settings", async () => {
  const response = deferred();
  let count = 0;
  const store = createCustomerSettingsStore(() => { count++; return response.promise; });
  const first = store.load();
  assert.equal(store.getSnapshot().loading, true);
  assert.equal(store.load(), first);
  assert.equal(count, 1);
  response.reject(new Error("offline"));
  await first;
  assert.equal(store.getSnapshot().settings, null);
  assert.equal(store.getSnapshot().loading, false);
  assert.equal(store.getSnapshot().error.message, "offline");
});

test("switches wait for confirmation, duplicate saves are prevented, and a reload reads persisted values", async () => {
  let saved = defaults();
  const response = deferred();
  const calls = [];
  const request = async (path, options) => {
    calls.push([path, options]);
    if (options) { await response.promise; saved = { ...saved, notifications: { ...saved.notifications, ...options.body } }; }
    return structuredClone(saved);
  };
  const store = createCustomerSettingsStore(request);
  await store.load();
  const saving = store.save("notifications", "email_enabled", false);
  assert.equal(store.getSnapshot().settings.notifications.email_enabled, true);
  assert.equal(store.getSnapshot().pending, "email_enabled");
  assert.equal(await store.save("notifications", "email_enabled", false), false);
  response.resolve();
  assert.equal(await saving, true);
  assert.equal(store.getSnapshot().settings.notifications.email_enabled, false);
  assert.equal(calls.length, 2);
  const refreshed = createCustomerSettingsStore(request);
  await refreshed.load();
  assert.equal(refreshed.getSnapshot().settings.notifications.email_enabled, false);
  assert.equal(refreshed.getSnapshot().pending, null);
});

test("failed saves restore the confirmed switch value and optimistic appearance", async () => {
  for (const [section, key, value] of [["notifications", "email_enabled", false], ["general", "theme", "dark"]]) {
    const response = deferred();
    const store = createCustomerSettingsStore(async (_path, options) => options ? response.promise : defaults());
    await store.load();
    const saving = store.save(section, key, value);
    if (section === "general") assert.equal(store.getSnapshot().settings.general.theme, "dark");
    response.reject(new Error("Save unavailable"));
    assert.equal(await saving, false);
    assert.deepEqual(store.getSnapshot().settings, defaults());
    assert.equal(store.getSnapshot().pending, null);
    assert.equal(store.getSnapshot().error.message, "Save unavailable");
  }
});

test("a late response from another customer's store cannot change the active account", async () => {
  const response = deferred();
  const previous = createCustomerSettingsStore(() => response.promise);
  const active = createCustomerSettingsStore(async () => defaults());
  const loading = previous.load();
  await active.load();
  response.resolve({ ...defaults(), general: { ...DEFAULT_GENERAL, theme: "dark" } });
  await loading;
  assert.equal(active.getSnapshot().settings.general.theme, "system");
});

test("system theme follows live OS changes, explicit choices override it, and listeners are removed", () => {
  const root = { dataset: {} };
  const listeners = new Set();
  const media = { matches: false, addEventListener: (_event, fn) => listeners.add(fn), removeEventListener: (_event, fn) => listeners.delete(fn) };
  const cleanup = watchThemePreference("system", root, media);
  assert.equal(root.dataset.theme, "light");
  media.matches = true;
  listeners.forEach((fn) => fn());
  assert.equal(root.dataset.theme, "dark");
  cleanup();
  assert.equal(listeners.size, 0);
  watchThemePreference("light", root, media)();
  assert.equal(root.dataset.theme, "light");
});

test("date formats, timezone rollover, timezone-independent dates, and booking clock formats", () => {
  const general = { ...DEFAULT_GENERAL, timezone: "America/Los_Angeles", time_format: "24h" };
  assert.equal(formatLocalDateTime("2026-11-13T00:30:00Z", {}, general), "12/11/2026, 16:30");
  assert.equal(formatLocalDateTime("2026-11-13T00:30:00", {}, general), "12/11/2026, 16:30");
  assert.equal(formatLocalDate("2026-11-13", general), "13/11/2026");
  assert.equal(formatLocalDate("20 November 2026", general), "20/11/2026");
  assert.equal(formatLocalDateTime("20 November 2026", {}, general), "20/11/2026");
  assert.equal(formatCalendarDate(new Date(2026, 10, 20), general), "20/11/2026");
  assert.equal(formatLocalDate("2026-11-13", { ...general, date_format: "MM/DD/YYYY" }), "11/13/2026");
  assert.equal(formatLocalDate("2026-11-13", { ...general, date_format: "YYYY-MM-DD" }), "2026-11-13");
  assert.equal(formatLocalDate("2026-02-30", general), "—");
  assert.equal(formatWallTime("20:05:00", general), "20:05");
  assert.equal(formatWallTime("00:05", { ...general, time_format: "12h" }), "12:05 AM");
  assert.equal(formatWallTime("12:05", { ...general, time_format: "12h" }), "12:05 PM");
  assert.equal(formatWallTime("25:00", general), "—");
});

test("daylight saving uses the instant's offset; customer formatting is cleared for other portals", () => {
  const general = { ...DEFAULT_GENERAL, timezone: "America/New_York", time_format: "24h", date_format: "YYYY-MM-DD" };
  assert.equal(formatLocalDateTime("2026-03-08T06:30:00Z", {}, general), "2026-03-08, 01:30");
  assert.equal(formatLocalDateTime("2026-03-08T07:30:00Z", {}, general), "2026-03-08, 03:30");
  setCustomerDateTimePreferences(general);
  assert.equal(formatLocalDate("2026-11-13"), "2026-11-13");
  setCustomerDateTimePreferences(null);
  assert.equal(formatLocalDate("2026-11-13"), "13/11/2026");
});

test("timezone options contain valid IANA identifiers and UTC", () => {
  const zones = timezoneOptions();
  assert.ok(zones.includes("UTC"));
  for (const timeZone of zones) assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone }));
});

test("manager settings reuse the store with manager-scoped API paths", async () => {
  const calls = [];
  let response = defaults();
  const store = createCustomerSettingsStore(async (path, options) => {
    calls.push([path, options]);
    if (options) response = { ...response, general: { ...response.general, ...options.body } };
    return structuredClone(response);
  }, "/api/manager/settings");
  await store.load();
  assert.equal(calls[0][0], "/api/manager/settings");
  assert.equal(await store.save("general", "theme", "dark"), true);
  assert.equal(calls[1][0], "/api/manager/settings/general");
  assert.equal(store.getSnapshot().settings.general.theme, "dark");
});

test("manager responses cannot change a customer or a later manager's store", async () => {
  const pending = deferred();
  const oldManager = createCustomerSettingsStore(() => pending.promise, "/api/manager/settings");
  const customer = createCustomerSettingsStore(async () => defaults());
  const newManager = createCustomerSettingsStore(async () => defaults(), "/api/manager/settings");
  const loading = oldManager.load();
  await Promise.all([customer.load(), newManager.load()]);
  pending.resolve({ ...defaults(), general: { ...DEFAULT_GENERAL, theme: "dark" } });
  await loading;
  assert.equal(customer.getSnapshot().settings.general.theme, "system");
  assert.equal(newManager.getSnapshot().settings.general.theme, "system");
});
