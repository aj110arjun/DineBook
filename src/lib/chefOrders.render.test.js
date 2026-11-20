import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

let workspace, temporary;
before(async () => {
  const result = await build({ logLevel: "silent", build: { ssr: "src/components/chef/ChefOrdersWorkspace.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.chef-orders-render-"));
  for (const chunk of result.output) if (chunk.type === "chunk") {
    const file = join(temporary, chunk.fileName);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, chunk.code);
  }
  workspace = await import(pathToFileURL(join(temporary, "ChefOrdersWorkspace.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

const order = {
  id: "a1000001-0000-4000-8000-000000000001", customer_name: "Preview guest", customer_email: "private@example.test",
  status: "ACCEPTED", service_type: "DINE_IN", created_at: "2028-02-29T10:00:00Z",
  tables: [{ table_number: "A4", floor_name: "Terrace" }],
  reservation: { reservation_date: "2028-02-29", start_time: "19:00", number_of_guests: 4, special_request: "Window table" },
  customer_note: "Peanut allergy: use separate utensils.",
  items: [{ variant_id: "food", food_name: "Garden salad", variant_name: "Large", description: "Seasonal vegetables", quantity: 2, line_total: 450 }],
  payment_method: "PAY_AT_DESK", payment_status: "PENDING", total: 450,
};
const renderDetails = (status, extra = {}) => renderToStaticMarkup(createElement(workspace.ChefOrderDetails, { order: { ...order, status }, onUpdate() {}, ...extra }));
const renderWorkspace = (extra = {}) => renderToStaticMarkup(createElement(workspace.default, {
  orders: [order], total: 1, calendarOrderCounts: { "2028-02-29": 2 }, month: new Date(2028, 1, 1), selectedDate: "2028-02-29",
  loading: false, initialLoading: false, refreshing: false, error: "", notice: "", busy: "", realtimeStatus: "connected",
  filters: { search: "", status: "ACTIVE", sort: "oldest" }, pagination: { page: 1, pageSize: 10, onPageChange() {} },
  onSearch() {}, onStatus() {}, onSort() {}, onResetFilters() {}, onSelectDate() {}, onMonthChange() {}, onToday() {}, onRefresh() {}, onUpdate() {}, ...extra,
}));

test("chef order details show dishes and allergy instructions without reservation management or payment controls", () => {
  const html = renderDetails("ACCEPTED");
  for (const label of ["Garden salad", "Seasonal vegetables", "Peanut allergy", "Window table", "Table A4", "Terrace", "Party size", "×2"])
    assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /private@example|Record payment|Cancel reservation|Reject reservation|Reservation fee|Mark guest seated|₹/);
});

test("chef kitchen actions remain restricted to preparation, readiness and serving", () => {
  for (const [status, expected] of [["ACCEPTED", "Start preparing"], ["PREPARING", "Mark ready"], ["READY", "Mark as served"]]) {
    const html = renderDetails(status);
    assert.match(html, new RegExp(expected));
    assert.equal((html.match(/<button/g) || []).length, 1);
    assert.match(renderDetails(status, { busy: true }), /disabled=""/);
    assert.match(renderDetails(status, { disabled: true }), /disabled=""/);
  }
  for (const status of ["PLACED", "SERVED", "COMPLETED", "CANCELLED", "REJECTED"]) assert.doesNotMatch(renderDetails(status), /<button/);
  assert.match(renderDetails("PLACED"), /Awaiting manager acceptance/);
});

test("the chef calendar includes leap day and labels counts as orders", () => {
  const html = renderWorkspace();
  assert.equal((html.match(/data-date=/g) || []).length, 29);
  assert.match(html, /aria-label="Orders calendar"/);
  assert.match(html, /February 29, 2028, 2 orders/);
  assert.match(html, /aria-label="Scroll to later dates"/);
  assert.doesNotMatch(html, /2 activities|Scan pass|Reservations &amp; Orders/);
});

test("failed requests hide stale order details and actions and offer a retry", () => {
  const html = renderWorkspace({ error: "Connection interrupted" });
  assert.match(html, /role="alert"/);
  assert.match(html, /Try again/);
  assert.match(html, /Orders unavailable/);
  assert.doesNotMatch(html, /Start preparing|Preview guest|Peanut allergy/);
});
