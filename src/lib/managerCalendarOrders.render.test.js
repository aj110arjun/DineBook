import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { build } from "vite";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

let calendar, temporary;
before(async () => {
  const result = await build({ logLevel: "silent", build: { ssr: "src/components/manager/ManagerCalendarOrders.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.calendar-orders-render-"));
  for (const chunk of result.output) if (chunk.type === "chunk") {
    const file = join(temporary, chunk.fileName);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, chunk.code);
  }
  calendar = await import(pathToFileURL(join(temporary, "ManagerCalendarOrders.js")));
});
after(async () => {
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

const order = {
  id: "b1000001-0000-4000-8000-000000000001", customer_name: "Walk-in guest", customer_email: null,
  status: "PREPARING", service_type: "DINE_IN", order_source: "SPOT", created_at: "2026-11-21T08:30:00",
  tables: [{ table_number: "T-04", floor_name: "Garden terrace" }],
  items: [{ variant_id: "variant", food_name: "Grilled paneer", variant_name: "Regular", image_url: "/test-dish.jpg", quantity: 2, unit_price: 280, line_total: 560 }],
  payment_method: "PAY_AT_DESK", payment_status: "PENDING", subtotal: 560, discount_amount: 56,
  offer_code: "WELCOME10", tax_percent: 5, tax_amount: 25.2, total: 529.2, customer_note: "Chutney separately, please.",
};
const renderDetails = (extra = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(calendar.ManagerCalendarOrderDetails, { order: { ...order, ...extra }, dateLabel: "Sat, Nov 21, 2026" })));

test("reservations and orders share active and completed groups, with served orders still active", () => {
  const activities = calendar.buildCalendarActivities(
    ["COMPLETED", "CONFIRMED", "CANCELLED", "SEATED", "PENDING_PAYMENT", "NO_SHOW"].map((status) => ({ id: `reservation-${status}`, status })),
    ["COMPLETED", "CANCELLED", "ACCEPTED", "REJECTED", "SERVED", "READY", "PLACED", "PREPARING"].map((status) => ({ id: `order-${status}`, status })),
  );
  assert.equal(activities.length, 14);
  const activeCount = activities.filter((entry) => entry.active).length;
  assert.equal(activeCount, 8);
  assert.ok(activities.slice(0, activeCount).every((entry) => entry.active));
  assert.ok(activities.slice(activeCount).every((entry) => !entry.active));
  assert.equal(activities.find((entry) => entry.item.status === "SERVED").active, true);
  assert.equal(activities.find((entry) => entry.type === "order").selectionId.startsWith("order:"), true);
  assert.equal(calendar.buildCalendarActivities([], [order])[0].selectionId, `order:${order.id}`);
});

test("order cards select the shared detail panel instead of navigating away", () => {
  const html = renderToStaticMarkup(createElement(calendar.ManagerCalendarOrderCard, { order, selected: true, onSelect() {} }));
  for (const text of ["View order for Walk-in guest", "Spot order", "2 items", "Table T-04", "Grilled paneer", "₹529.20", "Being prepared", "Viewing details"]) assert.ok(html.includes(text), text);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-controls="reservation-detail-panel"/);
  assert.doesNotMatch(html, /<a |Invalid Date|—/);
});

test("inline order details show guest, table, dishes, tax, discount, payment and notes", () => {
  const html = renderDetails();
  for (const text of ["ORDER DETAILS", "Restaurant guest", "Garden terrace", "Table T-04", "Grilled paneer", "Regular", "₹280.00 each", "₹560.00", "WELCOME10", "₹56.00", "Tax (5%)", "₹25.20", "₹529.20", "Pending", "Pay at desk", "Chutney separately", "Manage order"]) assert.ok(html.includes(text), text);
  assert.match(html, /href="\/manager\/orders\/b1000001/);
  assert.match(html, /src="\/test-dish.jpg"/);
  assert.match(html, /class="manager-order-item-quantity" aria-label="Quantity: 2">×2/);
  assert.doesNotMatch(html, /Reservation fee|Party size|Invalid Date/);
});

test("takeaway and cancelled orders keep their own details without invented table or guest counts", () => {
  const html = renderDetails({ service_type: "TAKEAWAY", tables: [], status: "CANCELLED", payment_status: "REFUNDED", status_reason: "Guest changed their plans." });
  for (const text of ["Takeaway order", "Cancelled", "Refunded", "Guest changed their plans."]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Garden terrace|Table T-04|Party size|Floor \/ zone/);
  assert.match(renderDetails({ items: [] }), /No item details are available/);
});
