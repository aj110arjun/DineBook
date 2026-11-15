import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { build } from "vite";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

let temporary, Panel, api;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: true, write: false,
    rollupOptions: { input: ["src/components/manager/ManagerAiWidget.jsx", "src/lib/managerAi.js"] },
  } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.manager-ai-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") {
    const path = join(temporary, chunk.fileName);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, chunk.code);
  }
  ({ ManagerAiPanel: Panel } = await import(pathToFileURL(join(temporary, "ManagerAiWidget.js"))));
  api = await import(pathToFileURL(join(temporary, "managerAi.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const chat = (extra = {}) => ({ active: null, conversations: [], messages: [], language: "en", status: { ready: true, model_available: true, support_url: "" },
  busy: false, loading: false, expired: false, error: "", send() {}, select() {}, newConversation() {}, remove() {}, ...extra });
const render = (value) => renderToStaticMarkup(createElement(StaticRouter, {}, createElement(Panel, { chat: value, id: "manager-chat", close() {} })));

test("manager welcome has operational quick actions and session history", () => {
  const html = render(chat());
  for (const label of ["Manager Assistant", "Today’s summary", "Upcoming reservations", "Active orders", "Pending payments", "Revenue this month", "Wallet balance", "Live table status", "Manager portal help", "Contact support", "Chats in this session", "Read-only assistance", 'role="dialog"', 'role="log"', 'maxLength="1000"']) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Find Restaurants|മലയാളം|हिन्दी/);
});

test("manager cards show key financial figures, safe manager links and escaped text", () => {
  const html = render(chat({ messages: [{ id: "answer", sender: "assistant", created_at: "2026-11-16T12:00:00Z", content: "**Revenue**\n\n<script>alert(1)</script>",
    answer: { cards: [{ kind: "manager_revenue", title: "Revenue", fields: { From: "2026-11-01", Through: "2026-11-16", "Gross collections": "INR 1200.00", Refunds: "INR 200.00", "Net revenue": "INR 900.00" }, href: "/manager/revenue" },
      { title: "Unsafe", fields: {}, href: "javascript:alert(1)" }], sources: [{ id: "help", title: "Menu", href: "/manager/menu" }] } }] }));
  assert.match(html, /<dt>Net revenue<\/dt><dd>₹900.00/);
  assert.match(html, /<dt>From<\/dt><dd>01\/11\/2026/);
  assert.match(html, /href="\/manager\/revenue"/);
  assert.match(html, /href="\/manager\/menu"/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|href="javascript:/);
});

test("manager links cannot leave their portal or traverse encoded paths", () => {
  assert.equal(api.safeManagerHref("/manager/orders/order-id"), "/manager/orders/order-id");
  for (const value of ["/customer/profile", "/admin/dashboard", "//evil.example", "https://evil.example", "javascript:alert(1)", "/manager/../admin", "/manager/%2e%2e/admin", "/manager/%2f..%2fadmin", "/manager/%5cadmin", "/manager/%00", "/manager/%zz"]) assert.equal(api.safeManagerHref(value), null, value);
});

test("availability, retry, stop and expired access explain the current state", () => {
  assert.match(render(chat({ status: null })), /Service unavailable/);
  assert.match(render(chat({ status: { ready: true, model_available: false } })), /Quick actions and portal help still work/);
  assert.match(render(chat({ busy: true })), /aria-label="Stop reply"/);
  assert.match(render(chat({ error: "Failed", canRetry: true })), /Retry reply/);
  const expired = render(chat({ expired: true, error: "Sign in again" }));
  assert.match(expired, /href="\/manager\/login"/);
  assert.doesNotMatch(expired, /href="\/customer\/login"/);
  assert.match(api.managerAiError({ status: 403 }), /restaurant approval/);
  assert.match(api.managerAiSummary([{ sender: "assistant", content: "Hello" }]), /^DineBook manager support summary/);
});
