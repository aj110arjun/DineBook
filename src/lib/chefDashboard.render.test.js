import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Serialized response from the real dashboard service over isolated SQL test records.
const fixture = JSON.parse(await readFile(new URL("../../tests/fixtures/chef-dashboard.json", import.meta.url), "utf8"));
let page, temporary;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/chef/ChefDashboardPage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.chef-dashboard-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  page = await import(pathToFileURL(join(temporary, "ChefDashboardPage.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (data = fixture, extra = {}) => renderToStaticMarkup(createElement(page.KitchenDashboardContent, {
  data, setPeriod() {}, setStatus() {}, setPage() {}, updateOrder() {}, navigate() {}, ...extra,
}));

test("database response renders six KPIs, real dishes, instructions, tables, reservations, and charts", () => {
  const html = render();
  for (const label of ["Today&#x27;s Orders", "Pending Orders", "Preparing Orders", "Ready Orders", "Completed Orders", "Average Preparation Time",
    "Garden salad", "No peanuts", "Table A4", "Terrace", "Preordered food", "Order Volume", "Order Status Distribution", "Preparation Performance", "Recent Kitchen Activity"])
    assert.ok(html.includes(label), `Missing ${label}`);
  assert.match(html, /15 min/);
  assert.match(html, /aria-label="Orders received by restaurant-local hour"/);
  assert.match(html, /aria-label="Average preparation time in minutes/);
  assert.match(html, /<title>/);
  assert.match(html, /N\/A/);
  assert.doesNotMatch(html, /NaN|Infinity|customer_email|payment_status/);
});

test("empty operations and missing measurements have useful states and omit fictional activity", () => {
  const empty = structuredClone(fixture);
  empty.active_orders = { items: [], total: 0, page: 1, page_size: 8 };
  empty.upcoming_reservations = empty.recent_activity = [];
  empty.order_volume.forEach((point) => point.total = 0);
  empty.status_distribution.forEach((point) => point.count = 0);
  empty.preparation_performance.forEach((point) => point.average_minutes = null);
  empty.summary.average_preparation_minutes = null;
  const html = render(empty);
  for (const text of ["No active orders match", "No upcoming confirmed reservations", "No orders received today", "No orders in this period", "No measured preparation times", "Unavailable"])
    assert.ok(html.includes(text), `Missing ${text}`);
  assert.doesNotMatch(html, /Recent Kitchen Activity|NaN|Infinity/);
});

test("valid actions come from backend permissions and are disabled while submitting or stale", () => {
  const order = fixture.active_orders.items.find((row) => row.status === "ACCEPTED");
  const card = (extra) => renderToStaticMarkup(createElement(page.KitchenOrderCard, { order, timezone: fixture.timezone, age: "25 min", updateOrder() {}, ...extra }));
  assert.match(card({}), /Start preparing/);
  assert.doesNotMatch(card({}), /Accept order|Mark as ready|Mark as served/);
  assert.match(card({ busy: true }), /disabled=""/);
  assert.match(card({ disabled: true }), /disabled=""/);
  assert.match(render(fixture, { actionsDisabled: true }), /disabled=""/);
});

test("loading, error, retry, and stale-data notices are accessible", () => {
  const renderFeedback = (props) => renderToStaticMarkup(createElement(page.KitchenFeedback, props));
  assert.match(renderFeedback({ loading: true }), /role="status"/);
  assert.match(renderFeedback({ loading: true }), /kitchen-skeleton/);
  assert.match(renderFeedback({ error: "Connection lost", hasData: true, refresh() {} }), /role="alert"/);
  assert.match(renderFeedback({ error: "Connection lost", hasData: true, refresh() {} }), /last successful update/);
  assert.match(renderFeedback({ error: "Connection lost", refresh() {} }), /Try again/);
});

test("daily volume reuses the existing accessible chart and filters match API values", () => {
  const daily = structuredClone(fixture);
  daily.group_by = "day";
  daily.order_volume = [{ date: "2026-11-13", total: 4 }];
  const html = render(daily, { period: "last7", status: "PREPARING" });
  assert.match(html, /aria-label="Orders received over time"/);
  assert.match(html, /value="last7" selected=""/);
  assert.match(html, /value="PREPARING" selected=""/);
  assert.match(html, /kitchen orders pagination/);
});
