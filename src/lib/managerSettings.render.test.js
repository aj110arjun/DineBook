import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_GENERAL } from "./customerSettings.js";

let content, temporary;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/manager/ManagerSettingsPage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.manager-settings-test-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ ManagerSettingsContent: content } = await import(pathToFileURL(join(temporary, "ManagerSettingsPage.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const fields = ["in_app_enabled", "reservation_confirmation", "reservation_reminders", "reservation_updates", "order_confirmation", "order_status_updates", "order_completion", "payment_confirmation", "refund_updates", "wallet_transactions", "review_updates", "staff_updates", "approval_updates"];
const settings = () => ({ general: { ...DEFAULT_GENERAL }, notifications: Object.fromEntries(fields.map((key) => [key, true])) });
const render = (state = {}) => renderToStaticMarkup(createElement(content, { preferences: { settings: settings(), loading: false, pending: null, error: null, success: "", load: () => {}, save: () => {}, ...state } }));

test("manager settings render operational notification switches and shared general controls", () => {
  const html = render();
  assert.equal((html.match(/role="switch"/g) || []).length, 13);
  assert.equal((html.match(/<select/g) || []).length, 5);
  for (const label of ["Notification Settings", "General Settings", "Manager Portal", "Theme", "Date format", "Time format", "Timezone", "Language", "Kitchen team updates"]) assert.ok(html.includes(label));
  assert.match(html, /saved automatically/);
  assert.match(html, /essential account messages/);
});

test("saved switch states and preferences are displayed without sample values", () => {
  const value = settings();
  value.notifications.in_app_enabled = false;
  value.general.theme = "dark";
  const html = render({ settings: value });
  assert.match(html, /aria-checked="false"/);
  assert.match(html, /value="dark" selected/);
});

test("pending changes disable controls and report save progress", () => {
  const html = render({ pending: "theme" });
  assert.match(html, /Saving your preference/);
  assert.equal((html.match(/ disabled=""/g) || []).length, 18);
});

test("load errors offer retry and loading never shows invented preference values", () => {
  const loading = render({ settings: null, loading: true });
  assert.match(loading, /Loading your settings/);
  assert.doesNotMatch(loading, /role="switch"/);
  const error = render({ settings: null, error: new Error("Cannot load settings") });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});
