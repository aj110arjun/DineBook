// Development-only integration fixture. All accounts and responses are synthetic.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Link, MemoryRouter } from "react-router-dom";
import axios from "axios";
import App from "../src/App.jsx";
import AppExperience, { AppErrorBoundary } from "../src/components/AppExperience.jsx";
import ConfirmActionDialog from "../src/components/ConfirmActionDialog.jsx";
import LoadingState from "../src/components/ui/LoadingState.jsx";
import AccountPreferencesProvider from "../src/components/preferences/AccountPreferences.jsx";
import { DEFAULT_GENERAL } from "../src/lib/customerSettings.js";
import { store } from "../src/state/store.js";
import manager from "./fixtures/manager-dashboard.json";
import ledger from "./fixtures/manager-ledger.json";
import chef from "./fixtures/chef-dashboard.json";
import admin from "./fixtures/admin-dashboard.json";
import "../src/assets/css/index.css";
import "../src/assets/css/styles.css";
import "../src/assets/css/design-system.css";
import "../src/assets/css/layout-refresh.css";
import "../src/assets/css/ux-improvements.css";
import "../src/assets/css/ui-experience.css";

document.documentElement.dataset.theme = "light";
let scenario = "ready", reduced = false, previewTheme = "light";
const nativeMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) => query === "(prefers-reduced-motion: reduce)" && reduced ? { matches: true } : nativeMatchMedia(query);
window.EventSource = class { addEventListener() {} removeEventListener() {} close() {} };
const restaurant = { id: "preview-restaurant", name: "Spice Garden", cuisine: "Indian", cuisine_type: "Indian", location: "Kochi", city: "Kochi", address: "Market Road", rating: 4.8, reviews: 12, status: "APPROVED", name_initial: "S", description: "Seasonal dishes and a welcoming table.", hours: [], offers: [], amenities: [], images: [] };
const account = (role) => ({ id: `preview-${role}`, name: `Preview ${role}`, avatar_url: "/favicon.svg", email: `${role}@example.test`, role: role.toUpperCase(), email_verified: true, restaurant_name: restaurant.name, must_change_password: false });
axios.defaults.adapter = async (config) => {
  const url = new URL(config.url, location.origin), path = url.pathname;
  if (!path.startsWith("/api/")) throw new Error("Fixture blocks external API requests");
  const identity = path.endsWith("/me") || path.includes("/settings");
  if (!identity && scenario === "pending") await new Promise((resolve, reject) => {
    const release = () => { cleanup(); resolve(); };
    const cancel = () => { cleanup(); reject(new axios.CanceledError()); };
    const cleanup = () => { window.removeEventListener("fixture-release", release); config.signal?.removeEventListener("abort", cancel); };
    window.addEventListener("fixture-release", release, { once: true }); config.signal?.addEventListener("abort", cancel, { once: true });
  });
  if (!identity && scenario === "error") return { data: { detail: "Preview connection unavailable. Please retry." }, status: 503, headers: {}, config };
  let data = [];
  if (path.endsWith("/me")) data = account(path.includes("manager") ? "manager" : path.includes("chef") ? "chef" : path.includes("admin") ? "admin" : "customer");
  else if (path.includes("/settings")) {
    data = { general: { ...DEFAULT_GENERAL, theme: previewTheme }, notifications: { email_enabled: true } };
    if (config.method === "patch") data.general = { ...data.general, ...JSON.parse(config.data) };
  }
  else if (path === "/api/manager/dashboard/overview") data = manager;
  else if (path === "/api/manager/ledger") {
    const page = Number(url.searchParams.get("page") || 1), pageSize = Number(url.searchParams.get("page_size") || 20);
    data = { ...ledger, start_date: url.searchParams.get("start_date"), end_date: url.searchParams.get("end_date"), page, page_size: pageSize,
      items: scenario === "empty" ? [] : ledger.items.slice((page - 1) * pageSize, page * pageSize), total: scenario === "empty" ? 0 : ledger.total };
  }
  else if (path === "/api/manager/ledger/export" || path === "/api/admin/ledger/export") {
    const format = url.searchParams.get("format");
    // Small synthetic download for transport/UI checks; backend tests verify all real file formats.
    const type = format === "csv" ? "text/csv" : "application/json";
    const csv = path.includes("/admin/") ? "Date,Restaurant,Gross,Refunds,Commission earned\n2026-11-13,Preview restaurant,1000.00,0.00,100.00\n" : "Date,Collected,Refunded\n2026-11-13,1000.00,0.00\n";
    return { data: new Blob([format === "csv" ? csv : '{"detail":"Use backend export tests for PDF and Excel."}'], { type }), status: format === "csv" ? 200 : 422, headers: { "content-type": type }, config };
  }
  else if (path === "/api/chef/dashboard") data = chef;
  else if (path === "/api/admin/dashboard/overview") data = admin.data;
  else if (path === "/api/admin/dashboard/restaurants") data = admin.restaurants;
  else if (path === "/api/admin/dashboard/activity") data = admin.activity;
  else if (path === "/api/customer/restaurants") data = config.url.includes("?") ? { items: scenario === "empty" ? [] : [restaurant], total: scenario === "empty" ? 0 : 1, cuisines: ["Indian"], locations: ["Kochi"] } : [restaurant];
  else if (path === "/api/admin/restaurants") data = { items: [ { ...restaurant, manager_name: "Preview manager", created_at: new Date().toISOString() } ], total: 1, cuisines: ["Indian"], locations: ["Kochi"] };
  else if (path.includes("/notifications")) data = path.endsWith("count") ? { count: 0 } : { items: [], total: 0 };
  else if (path === "/api/customer/restaurants/preview-restaurant") data = restaurant;
  else if (path.includes("/ai/status")) data = { ready: true, model_available: false, restaurant_id: restaurant.id, max_message_length: 1000, support_url: "" };
  else if (path.includes("/ai/conversations")) data = [];
  return { data, status: 200, headers: {}, config };
};

function PreviewControls() {
  const [mode, setMode] = useState("ready"), [dialog, setDialog] = useState(false), [gallery, setGallery] = useState(false), [mounts, setMounts] = useState({});
  useEffect(() => {
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
        for (const selector of [".site-header", ".manager-sidebar", ".chef-sidebar", ".admin-sidebar"]) {
          const count = Number(node.matches(selector)) + node.querySelectorAll(selector).length;
          if (count) setMounts((current) => ({ ...current, [selector]: (current[selector] || 0) + count }));
        }
      }
    });
    observer.observe(document.getElementById("app-preview"), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return <>
    <aside aria-label="Preview controls" style={{ position: "fixed", bottom: 8, left: 8, zIndex: 2100, maxWidth: "calc(100vw - 16px)", display: "flex", flexWrap: "wrap", gap: 8, padding: 10, borderRadius: 10, background: "var(--color-surface)", border: "1px solid var(--color-border)", fontSize: 12 }}>
      {[ ["Customer", "/customer/restaurants"], ["Manager", "/manager/dashboard"], ["Chef", "/chef/dashboard"], ["Admin", "/admin/dashboard"] ].map(([label,to]) => <Link key={to} to={to}>{label}</Link>)}
      <label>Scenario <select aria-label="Preview scenario" value={mode} onChange={(event) => { scenario = event.target.value; setMode(scenario); if (scenario !== "pending") window.dispatchEvent(new Event("fixture-release")); }}>
        {["ready", "pending", "error", "empty"].map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Theme <select aria-label="Preview theme" onChange={(event) => { previewTheme = event.target.value; document.documentElement.dataset.theme = previewTheme; }}><option>light</option><option>dark</option></select></label>
      <label><input type="checkbox" onChange={(event) => { reduced = event.target.checked; }} />Reduce motion</label>
      <button onClick={() => setDialog(true)}>Preview dialog</button><button onClick={() => setGallery((value) => !value)}>Skeleton gallery</button>
      <span role="status">Shell mounts {JSON.stringify(mounts)}</span>
    </aside>
    {gallery && <section aria-label="Skeleton gallery" style={{ position: "fixed", inset: "5%", zIndex: 2000, overflow: "auto", padding: 24, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16 }}><h1>Skeleton gallery · synthetic preview</h1>{["cards", "table", "form", "dashboard", "chat"].map((variant) => <section key={variant}><h2>{variant}</h2><LoadingState variant={variant} /></section>)}</section>}
    {dialog && <ConfirmActionDialog action="confirm" title="Preview confirmation" description="This only closes the synthetic preview dialog." onCancel={() => setDialog(false)} onConfirm={() => setDialog(false)} />}
  </>;
}
createRoot(document.getElementById("root")).render(<Provider store={store}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/customer/restaurants"]}><AccountPreferencesProvider><PreviewControls /><div id="app-preview"><AppExperience /><AppErrorBoundary><App /></AppErrorBoundary></div></AccountPreferencesProvider></MemoryRouter></Provider>);
