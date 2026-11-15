// Development-only fixture. All account data and API responses are synthetic.
// Open /tests/customer-ai-preview.html with Vite; never uses the real backend.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CustomerAiWidget from "../src/components/customer/CustomerAiWidget.jsx";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ux-improvements.css";

let mode = "ready", requests = 0, deleted = 0;
const conversations = new Map(), answers = new Map();
const now = () => new Date().toISOString();
const notify = () => window.dispatchEvent(new Event("fixture-update"));
axios.defaults.adapter = async (config) => {
  const path = config.url.split("/api/customer/ai")[1];
  let data;
  if (path === "/status") data = { ready: true, model_available: mode !== "offline", reply_timeout_seconds: mode === "timeout" ? 1 : 125, max_message_length: 1000, support_url: "" };
  else if (path === "/conversations" && config.method === "post") {
    data = { id: crypto.randomUUID(), title: "Customer support", language: "auto", created_at: now(), updated_at: now() }; conversations.set(data.id, data);
  } else if (path === "/conversations") data = [...conversations.values()];
  else if (config.method === "delete") { conversations.delete(path.split("/").at(-1)); deleted++; notify(); data = {}; }
  else data = { conversation: conversations.get(path.split("/").at(-1)), messages: [] };
  return { data, status: 200, statusText: "OK", headers: {}, config };
};
window.fetch = async (url, options) => {
  if (!String(url).includes("/api/customer/ai/")) throw new Error("Fixture disallows external requests");
  requests++; notify();
  const currentMode = mode;
  if (currentMode === "network") throw new TypeError("Failed to fetch");
  if (["server", "expired", "forbidden"].includes(currentMode)) return new Response(JSON.stringify({ detail: "Synthetic internal error: do not display" }), { status: currentMode === "server" ? 503 : currentMode === "expired" ? 401 : 403, headers: { "Content-Type": "application/json" } });
  const payload = JSON.parse(options.body);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ["slow", "timeout"].includes(currentMode) ? 5000 : 300);
    options.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
  const answer = answers.get(payload.client_message_id) || {
    message_id: crypto.randomUUID(), as_of: now(), language: "en", sources: [], limited: currentMode === "offline", cards: [],
    reply: payload.message.includes("malicious") ? "**Safe text**\n\n<script>alert('unsafe')</script>\n\n[Unsafe](javascript:alert(1))" : "Here’s what I found for you.\n\n- Your information stays private.\n- Open the relevant page to check the latest details.",
  };
  if (payload.action === "wallet") answer.cards = [{ kind: "wallet", title: "Your wallet", fields: { Balance: "INR 125.00" }, href: "/customer/profile/wallet" }];
  if (payload.action === "reservations") answer.cards = [{ kind: "reservation", title: "The Garden Table", fields: { Status: "CONFIRMED", Date: "2026-11-18", "Start time": "19:00", Guests: "2", Timezone: "Asia/Kolkata" }, href: "/customer/profile/reservations/fixture" }];
  answers.set(payload.client_message_id, answer);
  return new Response(`event: status\ndata: {"message":"Checking"}\n\nevent: done\ndata: ${JSON.stringify(answer)}\n\n`, { headers: { "Content-Type": "text/event-stream" } });
};

function Preview() {
  const [customer, setCustomer] = useState(1);
  const [, update] = useState(0);
  React.useEffect(() => { const listener = () => update((value) => value + 1); window.addEventListener("fixture-update", listener); return () => window.removeEventListener("fixture-update", listener); }, []);
  return <MemoryRouter><main style={{ padding: "28px", maxWidth: 760 }}>
    <p style={{ color: "var(--color-primary)", fontSize: 12, letterSpacing: ".12em" }}>DINEBOOK · INTERACTION PREVIEW</p>
    <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, margin: "14px 0" }}>A little help for your next table.</h1>
    <p style={{ marginBottom: 24, lineHeight: 1.8 }}>Isolated UI test with synthetic account data. Open the assistant in the bottom-right corner.</p>
    <label>Service scenario <select aria-label="Service scenario" defaultValue="ready" onChange={(event) => { mode = event.target.value; update((value) => value + 1); }}>
      {["ready", "offline", "server", "network", "expired", "forbidden", "slow", "timeout"].map((value) => <option key={value}>{value}</option>)}
    </select></label>
    <label style={{ marginLeft: 16 }}>Theme <select aria-label="Preview theme" onChange={(event) => document.documentElement.dataset.theme = event.target.value}><option>light</option><option>dark</option></select></label>
    <div style={{ margin: "20px 0", display: "flex", gap: 10 }}><button onClick={() => { conversations.clear(); answers.clear(); setCustomer((value) => value + 1); }}>New customer session</button><button onClick={() => setCustomer(0)}>Sign out preview</button></div>
    <p role="status">Reply requests: {requests} · Deleted chats: {deleted}</p>
    <p style={{ marginTop: 16 }}>Use the “malicious” message to check safe rendering. Use “slow” to check minimizing, drafts and Stop.</p>
  </main><CustomerAiWidget key={customer} user={customer ? { id: `fixture-${customer}`, role: "CUSTOMER" } : null} /></MemoryRouter>;
}
createRoot(document.getElementById("root")).render(<Preview />);
