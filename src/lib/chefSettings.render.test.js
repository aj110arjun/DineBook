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
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/chef/ChefSettingsPage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.chef-settings-test-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ ChefSettingsContent: content } = await import(pathToFileURL(join(temporary, "ChefSettingsPage.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const fields = ["in_app_enabled", "order_confirmation", "order_status_updates", "order_completion", "payment_confirmation", "refund_updates", "wallet_transactions"];
const settings = () => ({ general: { ...DEFAULT_GENERAL }, notifications: Object.fromEntries(fields.map((key) => [key, true])) });
const render = (state = {}) => renderToStaticMarkup(createElement(content, { preferences: {
  settings: settings(), loading: false, pending: null, error: null, success: "", load() {}, save() {}, ...state,
} }));

test("chef settings expose kitchen and wallet notifications and all general settings", () => {
  const html = render();
  assert.equal((html.match(/role="switch"/g) || []).length, 7);
  assert.equal((html.match(/<select/g) || []).length, 5);
  for (const label of ["Notification Settings", "General Settings", "Chef Portal", "New orders", "Order status updates", "Wallet transactions", "Theme", "Language", "Date format", "Time format", "Timezone"]) assert.ok(html.includes(label));
  assert.match(html, /saved automatically/);
  assert.match(html, /essential account messages/);
});

test("saved choices are reflected and pending saves disable every control", () => {
  const value = settings();
  value.notifications.in_app_enabled = false;
  value.general.theme = "dark";
  const html = render({ settings: value, pending: "theme" });
  assert.match(html, /aria-checked="false"/);
  assert.match(html, /value="dark" selected/);
  assert.match(html, /Saving your preference/);
  assert.equal((html.match(/ disabled=""/g) || []).length, 12);
});

test("loading and failed loads provide feedback and retry without showing fake settings", () => {
  const loading = render({ settings: null, loading: true });
  assert.match(loading, /Loading your settings/);
  assert.doesNotMatch(loading, /role="switch"/);
  const error = render({ settings: null, error: new Error("Cannot load chef settings") });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /role="switch"/);
});
