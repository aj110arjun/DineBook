import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { demoCustomer } from "../data/demoCustomer.js";

let temporary, Panel, SignInPanel, Header, Support, store;
before(async () => {
  const output = await build({ logLevel: "silent", plugins: [{
    name: "isolate-notification-portals",
    enforce: "pre",
    resolveId(source) { if (source.endsWith("NotificationSession.jsx")) return "\0notification-session-fixture"; },
    load(id) { if (id === "\0notification-session-fixture") return "export default function Session({children}) { return children; } export function useNotificationScope() { return null; }"; },
  }], build: { ssr: true, write: false,
    rollupOptions: { input: ["src/components/customer/CustomerAiWidget.jsx", "src/components/customer/CustomerAiSupport.jsx", "src/components/landing/CustomerHeader.jsx", "src/state/store.js"] },
  } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.customer-ai-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") {
    const path = join(temporary, chunk.fileName);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, chunk.code);
  }
  ({ CustomerAiPanel: Panel, CustomerAiSignInPanel: SignInPanel } = await import(pathToFileURL(join(temporary, "CustomerAiWidget.js"))));
  ({ default: Support } = await import(pathToFileURL(join(temporary, "CustomerAiSupport.js"))));
  ({ default: Header } = await import(pathToFileURL(join(temporary, "CustomerHeader.js"))));
  ({ store } = await import(pathToFileURL(join(temporary, "store.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const chat = (extra = {}) => ({ active: null, conversations: [], messages: [], language: "auto", status: { ready: true, support_url: "" },
  busy: false, loading: false, expired: false, error: "", send() {}, select() {}, newConversation() {}, setLanguage() {}, remove() {}, ...extra });
const render = (value) => renderToStaticMarkup(createElement(StaticRouter, {}, createElement(Panel, { chat: value, id: "support", close() {} })));

test("the customer panel includes history, language, quick actions and accessible composer", () => {
  const html = render(chat());
  for (const value of ["My reservations", "Wallet balance", "Human support", "മലയാളം", "हिन्दी", "Conversations", 'role="dialog"', 'role="log"', 'maxLength="1000"']) assert.ok(html.includes(value), value);
});

test("account facts render safely with internal links and no active HTML", () => {
  const html = render(chat({ messages: [{ id: "answer", sender: "assistant", created_at: "2026-11-15T12:00:00Z",
    content: '**Recorded information**\n\n<script>alert(1)</script>', answer: { cards: [
      { title: '<img src=x onerror=alert(1)>', fields: { Balance: "INR 125.00" }, href: "javascript:alert(1)" },
    ], sources: [{ id: "wallet", title: "Wallet", href: "/customer/profile/wallet" }] },
  }] }));
  assert.match(html, /<strong>Recorded information<\/strong>/);
  assert.match(html, /₹125.00/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img|href="javascript:/);
  assert.match(html, /href="\/customer\/profile\/wallet"/);
});

test("restaurant cards keep contact details collapsed and omit internal restaurant IDs", () => {
  const html = render(chat({ messages: [{ id: "restaurant", sender: "assistant", created_at: "2026-11-15T12:00:00Z",
    content: "Which restaurant?", answer: { cards: [{ title: "Good Kitchen", kind: "restaurant", restaurant_id: "restaurant-id",
      fields: { "Restaurant ID": "internal-restaurant-id", Cuisine: "Indian", City: "Kochi", Address: "Market Road", Phone: "+91 1234567890", Email: "hello@example.com" },
      href: "/customer/restaurants/restaurant-id" }], sources: [] },
  }] }));
  assert.match(html, /<dt>Cuisine<\/dt><dd>Indian<\/dd>/);
  assert.match(html, /<details class="customer-ai-details"><summary>More details<\/summary><dl><div><dt>Phone/);
  assert.doesNotMatch(html, /<details[^>]* open|Restaurant ID|internal-restaurant-id/);
  assert.match(html, />Availability<\/button>/);
});

test("booking cards show readable essentials and keep the complete reference in more details", () => {
  const html = render(chat({ messages: [{ id: "booking", sender: "assistant", created_at: "2026-11-15T12:00:00Z",
    content: "Here are your latest bookings.", answer: { cards: [{ title: "Good Kitchen", kind: "reservation", restaurant_id: "restaurant-id",
      fields: { "Booking ID": "full-booking-reference", Status: "PENDING_PAYMENT", Date: "2026-11-17", "Start time": "19:00", Timezone: "Asia/Kolkata", Guests: "4", "Fee payment": "PENDING" },
      href: "/customer/profile/reservations/booking-id" }], sources: [] },
  }] }));
  assert.match(html, /Awaiting payment/);
  assert.match(html, /17\/11\/2026/);
  assert.match(html, /Time \(IST\)<\/dt><dd>7:00 PM/);
  assert.match(html, /<details class="customer-ai-details"><summary>More details<\/summary><dl><div><dt>Booking ID<\/dt><dd>full-booking-reference/);
  assert.doesNotMatch(html, /customer-ai-followups/);
});

test("busy and expired states provide stop and sign-in controls", () => {
  assert.match(render(chat({ busy: true })), /aria-label="Stop reply"/);
  const html = render(chat({ expired: true, error: "Please sign in" }));
  assert.match(html, /href="\/customer\/login"/);
  assert.match(html, /disabled=""/);
});

test("the portal renders one Help button across customer pages, including guest and preview sessions", () => {
  const support = (user, location) => {
    store.dispatch({ type: "customerSession/setCustomerSession", payload: user });
    return renderToStaticMarkup(createElement(Provider, { store }, createElement(StaticRouter, { location }, createElement(Support))));
  };
  const customer = { id: "customer", name: "Customer", role: "CUSTOMER" };
  for (const location of ["/customer", "/customer/restaurants", "/customer/profile", "/customer/settings", "/customer/profile/wallet", "/customer/profile/transactions", "/customer/profile/reservations/booking", "/customer/profile/orders"]) {
    assert.equal(support(customer, location).match(/Open customer support/g)?.length, 1, location);
  }
  assert.match(support(null, "/customer"), /Open customer support/);
  assert.match(support(demoCustomer, "/customer"), /Open customer support/);
  for (const location of ["/admin/dashboard", "/manager/dashboard", "/chef/dashboard", "/customer/login", "/customer/register", "/customer/change-password"]) {
    assert.doesNotMatch(support(customer, location), /Open customer support/, location);
  }
  for (const role of ["ADMIN", "MANAGER", "CHEF"]) assert.doesNotMatch(support({ id: role, role }, "/customer"), /Open customer support/);
});

test("the guest support panel explains sign-in and has no account chat composer", () => {
  const panel = (preview) => renderToStaticMarkup(createElement(StaticRouter, {}, createElement(SignInPanel, { id: "support", preview, close() {} })));
  assert.match(panel(false), /href="\/customer\/login"/);
  assert.match(panel(false), /Sign in for support/);
  assert.match(panel(true), /local preview session/);
  assert.doesNotMatch(panel(false), /<textarea|<form/);
});

test("individual customer headers do not mount duplicate Help buttons", () => {
  const header = (user) => renderToStaticMarkup(createElement(Provider, { store }, createElement(StaticRouter, {}, createElement(Header, { user }))));
  for (const user of [null, demoCustomer, { id: "customer", role: "CUSTOMER" }, { id: "admin", role: "ADMIN" }, { id: "manager", role: "MANAGER" }, { id: "chef", role: "CHEF" }]) {
    assert.doesNotMatch(header(user), /Open customer support/);
  }
});
