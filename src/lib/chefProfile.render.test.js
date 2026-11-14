import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { profileForm, saveAccountProfile } from "./customerProfile.js";

let content, temporary;
const chef = { id: "chef", name: "Chef Name", email: "chef@example.com", phone: null, role: "CHEF", status: "ACTIVE", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-11-14T00:00:00Z" };
const restaurant = { id: "restaurant", name: "Assigned Kitchen", cuisine_type: "Indian", phone: null, address: "Main Street", city: "Pune", state: null, pin_code: null, status: "APPROVED" };
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/chef/ChefProfilePage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.chef-profile-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ ChefProfileContent: content } = await import(pathToFileURL(join(temporary, "ChefProfilePage.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (data = { chef, restaurant }) => renderToStaticMarkup(createElement(StaticRouter, { location: "/chef/profile" }, createElement(content, { data, onPersist() {}, onAuthError: () => false })));

test("chef profile shows the real account and read-only assigned restaurant", () => {
  const html = render();
  for (const label of ["Chef Details", "Chef Name", "chef@example.com", "Assigned Restaurant", "Assigned Kitchen", "Indian", "Pune", "Active", "Approved", "Edit Profile"]) assert.ok(html.includes(label), label);
  assert.match(html, /href="\/chef\/service-hours"/);
  assert.doesNotMatch(html, /Edit Restaurant|manager\/profile|password_hash|manager_id/);
  for (const field of ["name", "phone", "email"]) assert.match(html.match(new RegExp(`<input[^>]*id="chef-profile-${field}"[^>]*>`))[0], /readonly=""/);
});

test("missing photo, phone, and restaurant have explicit empty states", () => {
  const html = render({ chef, restaurant: null });
  assert.match(html, /Default profile avatar/);
  assert.match(html, /No phone number provided/);
  assert.match(html, /No restaurant is assigned/);
  assert.doesNotMatch(html, /Assigned Kitchen/);
});

test("profile edits and staged photo removal use chef-owned API paths", async () => {
  const current = { ...chef, avatar_url: "https://example.com/old.jpg" };
  const calls = [], updates = [];
  await saveAccountProfile({ current, form: { ...profileForm(current), name: "New Chef" }, removeAvatar: true, basePath: "/api/chef/profile",
    request: async (path, options) => { calls.push([path, options]); return { ...current, name: "New Chef", avatar_url: options.method === "DELETE" ? null : current.avatar_url }; },
    onPersist: (value) => updates.push(value),
  });
  assert.deepEqual(calls.map(([path, options]) => [path, options.method]), [["/api/chef/profile", "PATCH"], ["/api/chef/profile/avatar", "DELETE"]]);
  assert.equal(updates[0].name, "New Chef");
  assert.equal(updates[1].avatar_url, null);
});
