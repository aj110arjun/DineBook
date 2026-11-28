// Development-only preview. All guests, bookings, and responses are synthetic.
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import ManagerReservationsPage from "../src/features/manager/ManagerReservationsPage.jsx";
import { store } from "../src/state/store.js";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ux-improvements.css";
import "../src/assets/css/ui-experience.css";

const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = key(new Date());
const tables = [{ id: "table-1", table_number: 4, floor_name: "Garden terrace" }, { id: "table-2", table_number: 8, floor_name: "Main dining" }];
const food = { variant_id: "variant-1", food_name: "Grilled paneer", variant_name: "Regular", quantity: 2, line_total: 560 };
const guests = [
  { name: "Ananya Menon", status: "CONFIRMED", start: "19:00", count: 4, preorder: true },
  { name: "Rahul Varma", status: "PENDING_PAYMENT", start: "19:30", count: 2 },
  { name: "Meera Nair", status: "SEATED", start: "18:00", count: 3 },
  { name: "Aditya Rao", status: "COMPLETED", start: "13:00", count: 2 },
  { name: "Sara Joseph", status: "CANCELLED", start: "20:00", count: 6 },
];
let reservations = guests.map((guest, index) => ({
  id: `a1b2c3d${index}-0000-4000-8000-000000000000`, customer_name: guest.name,
  customer_email: `${guest.name.toLowerCase().replaceAll(" ", ".")}@example.test`,
  reservation_date: today, start_time: guest.start, end_time: "21:00", number_of_guests: guest.count,
  tables: [tables[index % 2]], status: guest.status, fee_amount: 250, payment_status: index === 1 ? "PENDING" : "PAID",
  fulfillment_type: guest.preorder ? "PREORDER" : "TABLE_ONLY", preorder_total: guest.preorder ? 560 : 0,
  preorder_payment_status: "PAID", preorder_payment_method: "WALLET", preorder_items: guest.preorder ? [food] : [],
  special_request: index === 0 ? "A quiet table near the garden, please. Celebrating a birthday." : "",
}));
const ordersFor = (id) => id === reservations[0]?.id ? [{ id: "order-1", status: "ACCEPTED", is_preorder: true, items: [food], total: 560, payment_status: "PAID" }] : [];
const standaloneOrders = [
  { id: "b1000001-0000-4000-8000-000000000001", customer_name: "Walk-in guest", status: "PREPARING", service_type: "DINE_IN", order_source: "SPOT", tables: [tables[0]], payment_status: "PENDING" },
  { id: "b1000002-0000-4000-8000-000000000002", customer_name: "Takeaway guest", status: "ACCEPTED", service_type: "TAKEAWAY", order_source: "WALK_IN", tables: [], payment_status: "PAID" },
  { id: "b1000003-0000-4000-8000-000000000003", customer_name: "Completed guest", status: "COMPLETED", service_type: "DINE_IN", order_source: "SPOT", tables: [tables[1]], payment_status: "PAID" },
  { id: "b1000004-0000-4000-8000-000000000004", customer_name: "Cancelled guest", status: "CANCELLED", service_type: "TAKEAWAY", order_source: "WALK_IN", tables: [], payment_status: "REFUNDED", status_reason: "Guest changed their plans." },
].map((order) => ({
  ...order, items: [{ ...food, unit_price: 280 }], subtotal: 560, discount_amount: 56, offer_code: "WELCOME10", tax_percent: 5, tax_amount: 25.2, total: 529.2,
  payment_method: "PAY_AT_DESK", created_at: `${today}T08:30:00`, accepted_at: `${today}T08:31:00Z`,
  customer_note: "Please pack the chutney separately.",
}));

document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
window.EventSource = class {
  addEventListener(type, callback) { if (type === "stream.ready") queueMicrotask(() => callback({ lastEventId: "preview" })); }
  close() {}
};
axios.defaults.adapter = async (config) => {
  const url = new URL(config.url, location.origin);
  const path = url.pathname;
  let data;
  if (path.endsWith("/me")) data = { id: "preview-manager", name: "Preview Manager", restaurant_hours: [] };
  else if (path === "/api/manager/calendar/summary") {
    const days = {};
    const start = new Date(`${url.searchParams.get("start_date")}T12:00:00`);
    for (let i = 1; i <= new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(); i++) {
      const date = key(new Date(start.getFullYear(), start.getMonth(), i));
      if (i % 3 === 0 || date === today) {
        const ordersOnly = new URLSearchParams(location.search).has("ordersOnly");
        days[date] = { reservations_count: ordersOnly ? 0 : 5, orders_count: 4, guest_count: ordersOnly ? 0 : 17, tones: ["confirmed", "pending", "completed"] };
      }
    }
    data = { days, tables };
  } else if (path === "/api/manager/calendar/activities") {
    const day = url.searchParams.get("day");
    const search = (url.searchParams.get("search") || "").toLowerCase();
    let items = Number(day.slice(-2)) % 3 === 0 || day === today ? reservations.map((item) => ({ ...item, reservation_date: day })) : [];
    const status = url.searchParams.get("status"), table = url.searchParams.get("table_id"), count = url.searchParams.get("guest_filter");
    if (new URLSearchParams(location.search).has("ordersOnly")) items = [];
    items = items.filter((item) => (!status || item.status === status) && (!table || item.tables.some((entry) => entry.id === table)) && (!count || (count === "6+" ? item.number_of_guests >= 6 : item.number_of_guests === Number(count))) && (!search || `${item.customer_name} ${item.customer_email} ${item.id}`.toLowerCase().includes(search)));
    items.sort((a, b) => url.searchParams.get("sort") === "guests" ? a.number_of_guests - b.number_of_guests : a.start_time.localeCompare(b.start_time));
    const total = items.length;
    const offset = (Number(url.searchParams.get("page") || 1) - 1) * Number(url.searchParams.get("page_size") || 10);
    const orderItems = Number(day.slice(-2)) % 3 === 0 || day === today ? standaloneOrders.filter((order) => (!status || order.status === status) && (!table || order.tables.some((entry) => entry.id === table)) && (!search || `${order.customer_name} ${order.id} ${order.items.map((food) => food.food_name).join(" ")}`.toLowerCase().includes(search))) : [];
    const orderOffset = (Number(url.searchParams.get("order_page") || 1) - 1) * 10;
    data = { reservations: { items: items.slice(offset, offset + 10), total, guest_count: items.reduce((sum, item) => sum + item.number_of_guests, 0) }, orders: { items: orderItems.slice(orderOffset, orderOffset + 10), total: orderItems.length } };
  } else if (/\/reservations\/[^/]+\/orders$/.test(path)) data = ordersFor(path.split("/").at(-2));
  else if (/\/reservations\/[^/]+\/status$/.test(path)) {
    const id = path.split("/").at(-2);
    reservations = reservations.map((item) => item.id === id ? { ...item, status: JSON.parse(config.data).status } : item);
    data = reservations.find((item) => item.id === id);
  } else if (path.includes("/notifications")) data = path.endsWith("count") ? { count: 0 } : { items: [], total: 0 };
  else if (/\/reservations\/[^/]+$/.test(path)) data = reservations.find((item) => item.id === path.split("/").at(-1));
  else throw new Error(`Preview blocks unsupported request: ${path}`);
  return { data, status: 200, headers: {}, config };
};

createRoot(document.getElementById("root")).render(
  <Provider store={store}><MemoryRouter initialEntries={["/manager/reservations"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ManagerReservationsPage /></MemoryRouter></Provider>,
);
