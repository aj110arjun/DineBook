// Development-only UI fixture. Requests and restaurant data are synthetic.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import ManagerAiWidget from "../src/components/manager/ManagerAiWidget.jsx";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/ui-experience.css";
import "../src/assets/css/layout-refresh.css";

let mode = "ready";
axios.defaults.adapter = async (config) => {
  if (!config.url.includes("/api/manager/ai/")) throw new Error("Fixture blocks external requests");
  const status = { ready: true, restaurant_id: "preview-restaurant", model_available: mode !== "offline", max_message_length: 1000, reply_timeout_seconds: 125, support_url: "" };
  if (config.url.endsWith("/status")) return { data: status, status: 200, headers: {}, config };
  const selected = mode;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, selected === "slow" ? 4000 : 200);
    config.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new axios.CanceledError()); }, { once: true });
  });
  if (selected === "error") return { data: { detail: "Synthetic server error" }, status: 503, headers: {}, config };
  if (selected === "expired") return { data: { detail: "Session expired" }, status: 401, headers: {}, config };
  const payload = JSON.parse(config.data);
  const action = payload.action || payload.context?.action || "overview";
  const data = { ...status, client_message_id: payload.client_message_id, message_id: `answer-${payload.client_message_id}`, as_of: new Date().toISOString(), language: "en", limited: selected === "offline", sources: [], cards: [], context: { action, period: "today", state: "active" }, reply: "Here’s your recorded restaurant activity. Open the relevant page for more details." };
  if (["overview", "revenue"].includes(action)) data.cards = [{ kind: "manager_revenue", title: "Restaurant revenue", fields: { From: "2026-11-01", Through: "2026-11-16", "Gross collections": "INR 12400.00", Refunds: "INR 200.00", Commission: "INR 1220.00", "Revenue after refunds": "INR 12200.00", "Net revenue": "INR 10980.00" }, href: "/manager/revenue" }];
  if (action === "wallet") data.cards = [{ kind: "wallet", title: "Manager wallet", fields: { Balance: "INR 3200.00" }, href: "/manager/revenue" }];
  if (action === "orders") data.cards = [{ kind: "order", title: "Restaurant order", fields: { "Order ID": "preview-order", Status: "PREPARING", Total: "INR 800.00", Payment: "PAID", Service: "DINE_IN", Placed: new Date().toISOString() }, href: "/manager/orders/preview-order" }];
  return { data, status: 200, headers: {}, config };
};

function Preview() {
  const [session, setSession] = useState(1);
  return <MemoryRouter><main style={{ padding: 28, maxWidth: 800 }}>
    <p style={{ color: "var(--color-primary)", fontSize: 12, letterSpacing: ".12em" }}>DINEBOOK · MANAGER PORTAL PREVIEW</p>
    <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, margin: "18px 0" }}>Your restaurant, at a glance.</h1>
    <p style={{ marginBottom: 20 }}>Isolated interface test. All restaurant information and requests are synthetic.</p>
    <label>Service scenario <select aria-label="Service scenario" onChange={(event) => { mode = event.target.value; }}>
      {["ready", "offline", "slow", "error", "expired"].map((value) => <option key={value}>{value}</option>)}
    </select></label>
    <button style={{ marginLeft: 16 }} onClick={() => setSession((value) => value + 1)}>New manager session</button>
    <p style={{ marginTop: 20 }}>Use the assistant in the bottom right to check quick actions, follow-up questions, drafts, Stop and Retry.</p>
  </main><ManagerAiWidget key={session} userId={`preview-manager-${session}`} /></MemoryRouter>;
}
createRoot(document.getElementById("root")).render(<Preview />);
