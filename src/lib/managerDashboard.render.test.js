import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let page, temporary;
const fixture = JSON.parse(await readFile(new URL("../../tests/fixtures/manager-dashboard.json", import.meta.url), "utf8"));
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/manager/ManagerDashboardPage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.dashboard-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  page = await import(pathToFileURL(join(temporary, "ManagerDashboardPage.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (data) => renderToStaticMarkup(createElement(page.DashboardContent, { data, sort: "quantity", setSort: () => {}, navigate: () => {} }));

test("dashboard renders a real backend response and currency values", () => {
  const html = render(fixture);
  assert.match(html, /₹2,750.00/);
  assert.match(html, /₹2,475.00/);
  assert.match(html, /13 Nov 2026/);
  assert.match(html, /Customer Growth/);
  assert.match(html, /Order Statuses/);
  assert.match(html, /Asia\/Kolkata/);
  assert.match(html, /<svg/);
  assert.match(html, /role="img"/);
  assert.match(html, /<title>/);
  for (const stale of ["₹42,580", "DB-9842", "18 Sep", "482 public reviews", "Arjun Sharma"]) assert.ok(!html.includes(stale));
});

test("empty charts and live lists show useful empty states", () => {
  const empty = structuredClone(fixture);
  empty.revenue_chart = empty.revenue_chart.map((p) => ({ ...p, revenue: "0", net: "0" }));
  empty.operations.order_status = [];
  empty.operations.reservation_status = [];
  empty.operations.order_trend = [];
  empty.operations.reservation_trend = [];
  empty.popular_items = [];
  empty.customers.trend = [];
  empty.payment_methods = [];
  empty.live.table_preview = [];
  empty.live.upcoming_reservations = [];
  empty.live.active_orders = [];
  const html = render(empty);
  assert.match(html, /No recorded collections or refunds/);
  assert.match(html, /No active tables/);
  assert.match(html, /No upcoming reservations/);
  assert.match(html, /No active orders/);
  assert.match(html, /No qualifying paid items/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("loading and API errors have accessible states and a retry action", () => {
  const loading = renderToStaticMarkup(createElement(page.DashboardFeedback, { loading: true }));
  assert.match(loading, /role="status"/);
  const error = renderToStaticMarkup(createElement(page.DashboardFeedback, { error: "Service unavailable", refresh: () => {} }));
  assert.match(error, /role="alert"/);
  assert.match(error, /Service unavailable/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /₹/);
});

test("negative revenue remains visible with data tooltips", () => {
  const data = structuredClone(fixture);
  data.revenue_chart[0].revenue = "-500.00";
  data.revenue_chart[0].net = "-450.00";
  const html = render(data);
  assert.match(html, /-₹500.00/);
  assert.match(html, /manager-chart-baseline/);
  assert.match(html, /Scroll to view all dates/);
});

test("a single short review retains its rating, full distribution, and text", () => {
  const data = structuredClone(fixture);
  data.reviews = { total: 1, average: "5", distribution: [1, 2, 3, 4, 5].map((rating) => ({ status: String(rating), count: rating === 5 ? 1 : 0 })),
    recent: [{ id: "review-one", rating: 5, content: "hello", created_at: "2026-11-10T00:00:00Z" }] };
  const html = render(data);
  assert.match(html, /Published rating distribution/);
  assert.match(html, /aria-label="5 stars: 1 review"/);
  for (const rating of [1, 2, 3, 4]) assert.ok(html.includes(`aria-label="${rating} stars: 0 reviews"`));
  assert.match(html, /hello/);
  assert.match(html, /1 review<\/span>/);
});
