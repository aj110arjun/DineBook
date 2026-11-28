import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let temporary, api;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/lib/customerAi.js", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.customer-ai-protocol-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  api = await import(pathToFileURL(join(temporary, "customerAi.js")));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

function reader(value, chunkSize = 1) {
  const bytes = new TextEncoder().encode(value);
  return new ReadableStream({ start(controller) {
    for (let offset = 0; offset < bytes.length; offset += chunkSize) controller.enqueue(bytes.slice(offset, offset + chunkSize));
    controller.close();
  } }).getReader();
}

test("SSE decodes Malayalam and Hindi across arbitrary byte and event boundaries", async () => {
  const events = [];
  const input = ': keep-alive\r\n\r\nevent: status\r\ndata: {"message":"loading"}\r\n\r\nevent: done\r\ndata: {"reply":"സഹായം हिन्दी","cards":[]}\r\n\r\n';
  await api.readSupportEvents(reader(input), (name, data) => events.push([name, data]));
  assert.equal(events[1][1].reply, "സഹായം हिन्दी");
  assert.deepEqual(events.map(([name]) => name), ["status", "done"]);
});

test("SSE preserves authorization errors and detects disconnected or oversized replies", async () => {
  await assert.rejects(api.readSupportEvents(reader('event: error\ndata: {"message":"Sign in again","status":401}\n\n'), () => {}),
    (error) => error.status === 401 && error.message === "Sign in again");
  await assert.rejects(api.readSupportEvents(reader(": keep-alive\n\n"), () => {}), /interrupted/);
  await assert.rejects(api.readSupportEvents(reader("x".repeat(65537), 65537), () => {}), /oversized/);
  await assert.rejects(api.readSupportEvents(reader("event: done\ndata: invalid\n\n"), () => {}), /unreadable/);
});

test("support links reject scripts, external images and unconfigured external URLs", () => {
  assert.equal(api.safeSupportHref("/customer/profile/orders"), "/customer/profile/orders");
  for (const value of ["javascript:alert(1)", "//evil.example", "https://evil.example", "/admin/dashboard", "data:text/html,hi", "/customer/../admin", "/customer/%2e%2e/admin", "/customer/%2f..%2fadmin", "/customer/%5cadmin", "/customer/%00", "/customer/%zz"]) {
    assert.equal(api.safeSupportHref(value), null);
  }
  assert.equal(api.safeSupportHref("https://help.example.com", "https://help.example.com"), "https://help.example.com");
});

test("draft validation matches backend limits while preserving multiline messages", () => {
  assert.match(api.supportDraftError("   \n"), /Write a message/);
  assert.equal(api.supportDraftError("  Find restaurants\nnear Kochi  "), "");
  assert.equal(api.supportDraftError("x".repeat(1000)), "");
  assert.match(api.supportDraftError("x".repeat(1001)), /1,000 characters/);
  assert.match(api.supportDraftError("x".repeat(101), 100), /100 characters/);
  assert.match(api.supportDraftError("😀".repeat(800), 2000), /shorten/);
});

test("friendly failures distinguish auth, access, timeout, network and unavailable service without exposing internals", () => {
  for (const [reason, expected] of [
    [{ status: 401 }, /session has expired/], [{ status: 403 }, /customer accounts/],
    [{ status: 504, message: "internal stack trace" }, /longer than expected/],
    [{ cause: { code: "ECONNABORTED" } }, /longer than expected/],
    [new TypeError("Failed to fetch"), /connection and retry/],
    [{ cause: { code: "ERR_NETWORK" } }, /connection and retry/],
    [{ status: 500, message: "private database details" }, /temporarily unavailable/],
    [{ status: 503 }, /temporarily unavailable/],
    [{ status: 404 }, /new chat/],
    [{ status: 422, message: "Please send a shorter message." }, /shorter message/],
  ]) assert.match(api.supportErrorMessage(reason), expected);
  assert.doesNotMatch(api.supportErrorMessage(new Error("private stack trace")), /stack trace/);
});

test("a completed SSE answer returns immediately and cannot deliver a duplicate done event", async () => {
  const events = [];
  const event = 'event: done\ndata: {"reply":"Ready","cards":[]}\n\n';
  await api.readSupportEvents(reader(event + event), (name) => events.push(name));
  assert.deepEqual(events, ["done"]);
});

test("each message receives a UUID for retry-safe server persistence", () => {
  const first = api.supportMessageId();
  assert.match(first, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  assert.notEqual(first, api.supportMessageId());
});

test("user-controlled escalation summaries include only the recent visible conversation", () => {
  const messages = Array.from({ length: 9 }, (_, index) => ({ sender: "user", content: `Question ${index}` }));
  messages.push({ sender: "assistant", content: "Recorded balance", answer: { cards: [{ title: "Wallet", fields: { Balance: "INR 123.45" } }] } });
  const value = api.supportSummary(messages);
  assert.doesNotMatch(value, /Question 0/);
  assert.match(value, /INR 123.45/);
});

test("support values format dates, times and statuses without changing codes or references", () => {
  assert.equal(api.supportFieldValue("Date", "2026-11-17"), "17/11/2026");
  assert.equal(api.supportFieldValue("Start time", "19:00"), "7:00 PM");
  assert.equal(api.supportFieldValue("Status", "PENDING_PAYMENT"), "Awaiting payment");
  assert.equal(api.supportFieldValue("Payment method", "PAY_AT_DESK"), "Pay at restaurant");
  assert.equal(api.supportFieldValue("Amount", "INR 123.45"), "₹123.45");
  assert.equal(api.supportFieldValue("Duration (minutes)", "90"), "90 min");
  assert.equal(api.supportFieldValue("Hours", "09:00–22:00"), "9:00 AM–10:00 PM");
  assert.equal(api.supportFieldValue("Created", "Not recorded"), "Not recorded");
  assert.equal(api.supportFieldValue("Code", "SAVE_MORE"), "SAVE_MORE");
  assert.equal(api.supportFieldValue("Order ID", "PENDING_PAYMENT"), "PENDING_PAYMENT");
  assert.equal(api.supportFieldLabel("Start time", { Timezone: "Asia/Kolkata" }), "Time (IST)");
});

test("support cards preserve secondary data while prioritizing the facts for their type", () => {
  const card = { kind: "order", fields: { "Order ID": "complete-order-reference", Status: "PREPARING", Total: "INR 118.00", Payment: "PAID", Tax: "INR 18.00" } };
  const { primary, secondary } = api.supportCardFields(card);
  assert.deepEqual(primary.map(([key]) => key), ["Status", "Total", "Payment"]);
  assert.deepEqual(secondary, [["Order ID", "complete-order-reference"], ["Tax", "INR 18.00"]]);
});
