// Development-only preview. All accounts, orders and API responses are synthetic.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import axios from "axios";
import OrdersPage from "../src/features/shared/OrdersPage.jsx";
import { ChefFrame } from "../src/components/chef/ChefLayout.jsx";
import PortalShell from "../src/components/ui/PortalShell.jsx";
import { store } from "../src/state/store.js";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ux-improvements.css";
import "../src/assets/css/ui-experience.css";

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = dateKey(new Date());
let scenario = "ready";
let orders = [
  { id: "a1000001-0000-4000-8000-000000000001", customer_name: "Ananya Menon", status: "ACCEPTED", service_type: "DINE_IN", is_preorder: true, order_source: "PREORDER", tables: [{ table_number: "4", floor_name: "Garden terrace" }], reservation: { reservation_date: today, start_time: "19:00", number_of_guests: 4, special_request: "Birthday dinner near the garden, please." }, customer_note: "Peanut allergy. Please use separate utensils.", items: [{ variant_id: "paneer", food_name: "Grilled paneer", variant_name: "Regular", quantity: 2, description: "Chargrilled cottage cheese with seasonal vegetables.", line_total: 560 }, { variant_id: "rice", food_name: "Saffron rice", variant_name: "Large", quantity: 1, line_total: 240 }], hour: 10 },
  { id: "a1000002-0000-4000-8000-000000000002", customer_name: "Rahul Varma", status: "PREPARING", service_type: "DINE_IN", tables: [{ table_number: "8", floor_name: "Main dining" }], items: [{ variant_id: "pasta", food_name: "Creamy mushroom pasta", variant_name: "Regular", quantity: 2, line_total: 680 }], customer_note: "Less spicy, please.", hour: 11 },
  { id: "a1000003-0000-4000-8000-000000000003", customer_name: "Meera Nair", status: "READY", service_type: "TAKEAWAY", tables: [], items: [{ variant_id: "salad", food_name: "Garden salad", variant_name: "Large", quantity: 1, line_total: 280 }], hour: 12 },
  { id: "a1000004-0000-4000-8000-000000000004", customer_name: "Aditya Rao", status: "PLACED", service_type: "DINE_IN", order_source: "SPOT", tables: [{ table_number: "2", floor_name: "Main dining" }], items: [{ variant_id: "soup", food_name: "Roasted tomato soup", variant_name: "Regular", quantity: 2, line_total: 360 }], hour: 13 },
  { id: "a1000005-0000-4000-8000-000000000005", customer_name: "Sara Joseph", status: "SERVED", service_type: "DINE_IN", tables: [{ table_number: "6", floor_name: "Main dining" }], items: [{ variant_id: "thali", food_name: "Seasonal thali", variant_name: "Regular", quantity: 3, line_total: 1200 }], hour: 8 },
  { id: "a1000006-0000-4000-8000-000000000006", customer_name: "Vivek Das", status: "CANCELLED", service_type: "TAKEAWAY", items: [{ variant_id: "coffee", food_name: "Filter coffee", quantity: 1, line_total: 90 }], status_reason: "Cancelled before preparation.", hour: 7 },
].map((order) => ({ ...order, created_at: `${today}T${String(order.hour).padStart(2, "0")}:00:00Z`, subtotal: 800, total: 800, payment_status: "PAID", payment_method: "WALLET" }));
window.EventSource = class { addEventListener(type, callback) { if (type === "stream.ready") queueMicrotask(() => callback({ lastEventId: "preview" })); } close() {} };
axios.defaults.adapter = async (config) => {
  const url = new URL(config.url, location.origin);
  let data;
  if (url.pathname === "/api/chef/orders") {
    if (scenario === "error") return { data: { detail: "Preview kitchen connection unavailable. Please retry." }, status: 503, headers: {}, config };
    const selectedDate = url.searchParams.get("selected_date"), search = (url.searchParams.get("search") || "").toLowerCase(), status = url.searchParams.get("status");
    const counts = {}, statuses = {};
    const start = new Date(`${url.searchParams.get("calendar_from")}T12:00:00`), end = new Date(`${url.searchParams.get("calendar_to")}T12:00:00`);
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (scenario !== "empty" && (day.getDate() % 3 === 0 || dateKey(day) === today)) { counts[dateKey(day)] = orders.length; statuses[dateKey(day)] = [...new Set(orders.map((order) => order.status))]; }
    }
    let items = counts[selectedDate] ? orders.map((order) => ({ ...order, created_at: `${selectedDate}T${String(order.hour).padStart(2, "0")}:00:00Z`, reservation: order.reservation ? { ...order.reservation, reservation_date: selectedDate } : null })) : [];
    items = items.filter((order) => (status === "ALL" || (status === "ACTIVE" ? ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(order.status) : order.status === status)) && (!search || `${order.id} ${order.customer_name} ${order.items.map((item) => item.food_name).join(" ")}`.toLowerCase().includes(search)));
    items.sort((a, b) => url.searchParams.get("sort") === "newest" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at));
    const page = Number(url.searchParams.get("page")), pageSize = Number(url.searchParams.get("page_size"));
    data = { total: items.length, guests: 4, calendar_counts: counts, calendar_statuses: statuses, items: items.slice((page - 1) * pageSize, page * pageSize) };
  } else if (/^\/api\/chef\/orders\/[^/]+\/status$/.test(url.pathname)) {
    const id = url.pathname.split("/").at(-2), next = JSON.parse(config.data).status;
    const order = orders.find((row) => row.id === id);
    if (!({ ACCEPTED: ["PREPARING"], PREPARING: ["READY"], READY: ["SERVED"] }[order?.status] || []).includes(next)) throw new Error("Preview blocks non-chef actions");
    orders = orders.map((row) => row.id === id ? { ...row, status: next } : row);
    data = orders.find((row) => row.id === id);
  } else throw new Error(`Preview blocks unsupported request: ${url.pathname}`);
  return { data, status: 200, headers: {}, config };
};
function ChefSession() { return <Outlet context={{ chef: { id: "preview-chef", name: "Arun Kumar", restaurant_name: "Spice Garden" } }} />; }
function Preview() {
  const [version, setVersion] = useState(0);
  return <Provider store={store}><MemoryRouter initialEntries={["/chef/orders"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes key={version}><Route element={<ChefSession />}><Route element={<PortalShell Frame={ChefFrame} />}><Route path="/chef/orders" element={<OrdersPage mode="chef" />} /></Route></Route></Routes>
    <aside style={{ position: "fixed", bottom: 8, left: 8, zIndex: 2100, display: "flex", flexWrap: "wrap", gap: 8, padding: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} aria-label="Preview controls">
      <label>Preview theme <select aria-label="Preview theme" onChange={(event) => { document.documentElement.dataset.theme = event.target.value; }}><option>light</option><option>dark</option></select></label>
      <label>Scenario <select aria-label="Preview scenario" onChange={(event) => { scenario = event.target.value; setVersion((current) => current + 1); }}><option>ready</option><option>empty</option><option>error</option></select></label>
    </aside>
  </MemoryRouter></Provider>;
}
createRoot(document.getElementById("root")).render(<Preview />);
