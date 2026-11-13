import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let content, temporary;
const fixture = {
  manager: { id: "manager", name: "Manager Name", email: "manager@example.com", phone: "+91 9876543210", role: "MANAGER", status: "ACTIVE", avatar_url: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-11-13T00:00:00Z" },
  restaurant: { id: "restaurant", name: "Real Kitchen", description: "Seasonal food", cuisine_type: "Indian", email: "hello@example.com", phone: "+91 9876543210", address: "Main Street", city: "Pune", state: "Maharashtra", pin_code: "411001", status: "APPROVED", branding_image_url: null, latitude: null, longitude: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-11-13T00:00:00Z", documents: [{ id: "document", document_type: "FSSAI_LICENSE", file_name: "license.pdf", created_at: "2026-01-01T00:00:00Z" }], operation: { date: "2026-11-13", timezone: "Asia/Kolkata", schedule_configured: false, is_open_now: null, periods: [] } },
};
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/manager/ManagerProfilePage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.manager-profile-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ ManagerProfileContent: content } = await import(pathToFileURL(join(temporary, "ManagerProfilePage.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (data = fixture) => renderToStaticMarkup(createElement(StaticRouter, { location: "/manager/profile" },
  createElement(content, { data, onManagerPersist: () => {}, onRestaurantPersist: () => {}, onAuthError: () => false })));

test("profile renders current account, restaurant, status and real document metadata", () => {
  const html = render();
  for (const label of ["Manager Details", "Restaurant Details", "Manager Name", "manager@example.com", "Real Kitchen", "Seasonal food", "Indian", "Pune", "411001", "Approved", "Active", "FSSAI license", "license.pdf"]) assert.ok(html.includes(label), label);
  assert.match(html, /Edit Profile/);
  assert.match(html, /Edit Restaurant Details/);
});

test("personal fields are prepopulated and sign-in email stays read-only", () => {
  const html = render();
  const name = html.match(/<input[^>]*id="manager-profile-name"[^>]*>/)[0];
  assert.match(name, /readonly=""/);
  assert.match(name, /value="Manager Name"/);
  const email = html.match(/<input[^>]*id="manager-profile-email"[^>]*>/)[0];
  assert.match(email, /readonly=""/);
  assert.match(email, /value="manager@example.com"/);
  assert.doesNotMatch(html, /name="(?:role|status|manager_id|password_hash)"/);
});

test("missing restaurant and absent media show explicit empty states", () => {
  assert.match(render({ manager: fixture.manager, restaurant: null }), /No restaurant is linked/);
  const html = render();
  assert.match(html, /Default profile avatar/);
  assert.match(html, /No restaurant branding image uploaded/);
  assert.match(html, /No map location has been saved/);
  assert.match(html, /Hours not configured/);
  assert.doesNotMatch(html, /Verified business|country/i);
});

test("saved coordinates reuse the existing map editor and maps link", () => {
  const value = structuredClone(fixture);
  value.restaurant.latitude = 18.52; value.restaurant.longitude = 73.85;
  const html = render(value);
  assert.match(html, /Saved restaurant map location/);
  assert.match(html, /18.52,73.85/);
  assert.match(html, /href="\/manager\/restaurant-location"/);
  assert.match(html, /noopener noreferrer/);
});
