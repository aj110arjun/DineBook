import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const fixture = JSON.parse(await readFile(new URL("../../tests/fixtures/admin-dashboard.json", import.meta.url), "utf8"));
let page, temporary;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/pages/admin/AdminDashboardPage.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.admin-dashboard-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  page = await import(pathToFileURL(join(temporary, "AdminDashboardPage.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const render = (name, props) => renderToStaticMarkup(createElement(StaticRouter, { location: "/admin/dashboard" }, createElement(page[name], props)));

test("real backend response renders all analytics with INR and no placeholder stats", () => {
  const html = render("AdminDashboardContent", { data: fixture.data });
  for (const phrase of ["Registered restaurants", "Commission earned", "₹1,500.00", "₹150.00", "Customer growth", "Confirmed pay at restaurant", "Successful wallet payments", "Bank settlement", "Unavailable", "View chart data", "aria-pressed=\"true\"", "Order statuses", "Reservation statuses"]) assert.ok(html.includes(phrase), phrase);
  for (const stale of ["Maya", "$428", "84,291", "99.98%", "Ava Rodriguez"]) assert.ok(!html.includes(stale));
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("empty database shows useful payment and chart empty states", () => {
  const html = render("AdminDashboardContent", { data: fixture.empty });
  assert.match(html, /No confirmed payment records/);
  assert.match(html, /No recorded activity/);
  assert.match(html, /No order statuses/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("loading skeleton and errors have accessible feedback and retry", () => {
  const loading = render("AdminDashboardFeedback", { loading: true });
  assert.match(loading, /role="status"/);
  assert.match(loading, /admin-skeleton-grid/);
  const error = render("AdminDashboardFeedback", { error: "Service unavailable", refresh: () => {} });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /₹/);
});

test("restaurant records retain ranking data, status, financial columns and pagination", () => {
  const html = render("RestaurantContent", { data: fixture.restaurants });
  for (const text of ["Actual restaurant", "Actual manager", "Pending restaurant", "Outstanding at period end", "Commission earned", "Compare this ranking", "Page 1 of 1"]) assert.ok(html.includes(text), text);
  const empty = render("RestaurantContent", { data: { items: [], leaders: [], total: 0, page: 1, page_size: 10 } });
  assert.match(empty, /No restaurants match these filters/);
});

test("activity only renders supplied events and handles empty history", () => {
  const html = render("ActivityContent", { data: fixture.activity });
  assert.match(html, /Payment recorded/);
  assert.match(html, /datetime=/i);
  assert.doesNotMatch(html, /example|Noah|Olivia/);
  const empty = render("ActivityContent", { data: { items: [], total: 0, page: 1, page_size: 8 } });
  assert.match(empty, /No recorded platform events/);
});

test("negative refund-period earnings and unledgered coverage remain explicit", () => {
  const data = structuredClone(fixture.data);
  data.revenue.summary.earned = "-100";
  data.kpis.earned_commission = "-100";
  data.revenue.trend[0].collected_net = "-100";
  data.payments.unledgered_paid = { count: 1, amount: "200" };
  const html = render("AdminDashboardContent", { data });
  assert.match(html, /-₹100.00/);
  assert.match(html, /no commission ledger snapshot/);
  assert.match(html, /₹200.00/);
});
