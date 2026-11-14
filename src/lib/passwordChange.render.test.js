import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

let temporary;
const content = {};
const roles = ["admin", "manager", "chef", "customer"];
const title = (role) => role[0].toUpperCase() + role.slice(1);
before(async () => {
  const output = await build({ logLevel: "silent", build: {
    ssr: true, write: false,
    rollupOptions: { input: roles.map((role) => `src/pages/${role}/${title(role)}SettingsPage.jsx`) },
  } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.password-settings-test-"));
  for (const chunk of output.output) if (chunk.type === "chunk") {
    const path = join(temporary, chunk.fileName);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, chunk.code);
  }
  for (const role of roles) {
    const page = await import(pathToFileURL(join(temporary, `${title(role)}SettingsPage.js`)));
    content[role] = page[`${title(role)}SettingsContent`];
  }
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

test("all four settings pages offer an explicit password action without rendering password values", () => {
  for (const role of roles) {
    const html = renderToStaticMarkup(createElement(content[role], { user: { can_change_password: true }, preferences: {
      accountId: role, settings: null, loading: true, pending: null, error: null, success: "", load() {}, save() {},
    } }));
    assert.match(html, /Security/);
    assert.match(html, /Change password/);
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /type="password"/);
  }
});

test("the password action remains available if general preferences fail to load", () => {
  for (const role of roles) {
    const html = renderToStaticMarkup(createElement(content[role], { user: { can_change_password: true }, preferences: {
      accountId: role, settings: null, loading: false, pending: null, error: new Error("Preferences unavailable"), success: "", load() {}, save() {},
    } }));
    assert.match(html, /Change password/);
    assert.match(html, /Try again/);
    assert.match(html, /Preferences unavailable/);
  }
});

test("Google customers and unresolved sessions have no password-change option", () => {
  for (const user of [{ can_change_password: false }, null]) {
    for (const error of [null, new Error("Preferences unavailable")]) {
      const html = renderToStaticMarkup(createElement(content.customer, { user, preferences: {
        accountId: "customer", settings: null, loading: !error, pending: null, error, success: "", load() {}, save() {},
      } }));
      assert.match(html, /Settings/);
      assert.doesNotMatch(html, /Change password|Update the password|type="password"/);
    }
  }
});
