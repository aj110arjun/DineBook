import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_GENERAL } from "./customerSettings.js";

let content, navigation, temporary;
before(async () => {
  const output = await build({ logLevel: "silent", build: {
    ssr: true,
    rollupOptions: { input: ["src/pages/admin/AdminSettingsPage.jsx", "src/components/admin/AdminPrimaryNav.jsx"] },
    write: false,
  } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.admin-settings-test-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ AdminSettingsContent: content } = await import(pathToFileURL(join(temporary, "AdminSettingsPage.js"))));
  ({ default: navigation } = await import(pathToFileURL(join(temporary, "AdminPrimaryNav.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

const fields = ["in_app_enabled", "approval_updates", "review_updates", "wallet_transactions", "system_updates"];
const settings = () => ({ general: { ...DEFAULT_GENERAL }, notifications: Object.fromEntries(fields.map((key) => [key, true])) });
const render = (state = {}) => renderToStaticMarkup(createElement(content, { preferences: {
  settings: settings(), loading: false, pending: null, error: null, success: "", load() {}, save() {}, ...state,
} }));

test("admin settings expose general controls and the supported notification categories", () => {
  const html = render();
  assert.equal((html.match(/role="switch"/g) || []).length, 5);
  assert.equal((html.match(/<select/g) || []).length, 5);
  for (const label of ["General Settings", "Notification Settings", "Admin Portal", "Restaurant requests", "Reviews and reports", "Wallet activity", "Optional system updates", "Theme", "Language", "Date format", "Time format", "Timezone"]) assert.ok(html.includes(label), label);
  assert.match(html, /saved automatically/);
  assert.match(html, /system incidents remain active/);
  assert.match(html, /Existing notifications stay/);
});

test("confirmed values render and a pending save disables every preference", () => {
  const value = settings();
  value.notifications.in_app_enabled = false;
  value.general.theme = "dark";
  const html = render({ settings: value, pending: "theme" });
  assert.match(html, /aria-checked="false"/);
  assert.match(html, /value="dark" selected/);
  assert.equal((html.match(/ disabled=""/g) || []).length, 10);
  assert.match(html, /Saving your preference/);
});

test("failed loads show retry without fabricated values and failed saves retain the form", () => {
  const loading = render({ settings: null, loading: true });
  assert.match(loading, /Loading your settings/);
  assert.doesNotMatch(loading, /role="switch"/);
  const failedLoad = render({ settings: null, error: new Error("Cannot load admin settings") });
  assert.match(failedLoad, /role="alert"/);
  assert.match(failedLoad, /Try again/);
  assert.doesNotMatch(failedLoad, /role="switch"/);
  const failedSave = render({ error: new Error("Save unavailable") });
  assert.match(failedSave, /Save unavailable/);
  assert.match(failedSave, /role="switch"/);
});

test("the admin sidebar links to settings and marks the route active", () => {
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/admin/settings" }, createElement(navigation)));
  const settingsLink = html.match(/<a[^>]*href="\/admin\/settings"[^>]*>/)?.[0] || "";
  assert.match(settingsLink, /aria-current="page"/);
  assert.match(html, /href="\/admin\/profile"/);
});
