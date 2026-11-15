import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Exercise the real hook with deterministic state/effect and transport doubles,
// following the existing realtime-hook test convention. No DOM dependency.
const source = readFileSync(new URL("../hooks/useCustomerAi.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "").replace("export default function", "function");

function setup() {
  const slots = [], effects = [], calls = [], streams = [], timers = new Map();
  let cursor = 0, effectQueue = [], chat, nextId = 0, timerId = 0, failure = null, updates = 0;
  const json = async (path, options = {}) => {
    calls.push({ path, options });
    if (failure) throw failure;
    if (path === "/status") return { ready: true, model_available: true, reply_timeout_seconds: 245 };
    if (path === "/conversations" && options.method === "POST") return { id: "conversation", title: "Customer support", language: "auto" };
    if (path === "/conversations") return [];
    if (options.method === "DELETE") return {};
    return { conversation: { language: "auto" }, messages: [] };
  };
  const hook = runInNewContext(`${source}\nuseCustomerAi`, {
    AbortController, SUPPORT_REPLY_TIMEOUT_MS: 125000,
    supportMessageId: () => `message-${++nextId}`,
    supportDraftError: (value) => value.trim() ? "" : "empty",
    supportErrorMessage: (reason) => reason.message,
    supportJson: (...args) => json(...args),
    streamSupportReply: (id, payload, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("cancelled"), { name: "AbortError" })), { once: true });
      streams.push({ id, payload, ...options, resolve, reject });
    }),
    window: { setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; }, clearTimeout: (id) => timers.delete(id) },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { updates++; slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!effects[index] || deps.some((value, n) => !Object.is(value, effects[index].deps[n]))) {
        effectQueue.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() }; });
      }
    },
  });
  const render = (open = false) => { cursor = 0; chat = hook("customer", open); const queue = effectQueue; effectQueue = []; queue.forEach((effect) => effect()); return chat; };
  render();
  return {
    render, calls, streams, timers,
    async ready() { await chat.refresh(); return render(); },
    fail(value) { failure = value; },
    unmount() { effects.forEach((effect) => effect?.cleanup?.()); },
    updates: () => updates,
    finish(index = streams.length - 1) {
      const stream = streams[index];
      stream.onEvent("done", { message_id: `answer-${stream.payload.client_message_id}`, reply: "Recorded information", cards: [], as_of: "2026-11-16T12:00:00Z" });
      stream.resolve();
    },
  };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("rapid submissions have one ordered user/assistant pair and use the server's CPU timeout", async () => {
  const app = setup(); let chat = await app.ready();
  const first = chat.send("  My reservations  ", "reservations");
  assert.equal(await chat.send("My reservations", "reservations"), false);
  await flush();
  assert.equal(app.streams.length, 1);
  assert.equal(app.streams[0].payload.message, "My reservations");
  assert.equal([...app.timers.values()][0].ms, 245000);
  app.finish(); assert.equal(await first, true);
  chat = app.render();
  assert.deepEqual(Array.from(chat.messages, (message) => message.sender), ["user", "assistant"]);
  assert.equal(chat.busy, false); assert.equal(chat.canRetry, false);
  assert.equal(app.timers.size, 0);
  const second = chat.send("Track my order", "orders"); await flush(); app.finish(); await second;
  assert.deepEqual(Array.from(app.render().messages, (message) => message.sender), ["user", "assistant", "user", "assistant"]);
});

test("failed messages retry with their original UUID and do not duplicate either bubble", async () => {
  const app = setup(); let chat = await app.ready();
  const failed = chat.send("My wallet", "wallet"); await flush();
  app.streams[0].reject(new Error("Offline")); assert.equal(await failed, false);
  chat = app.render(); assert.equal(chat.canRetry, true); assert.equal(chat.messages[0].delivery, "failed");
  const retry = chat.retry(); await flush();
  assert.equal(app.streams[0].payload.client_message_id, app.streams[1].payload.client_message_id);
  app.finish(); await retry;
  chat = app.render(); assert.equal(chat.messages.length, 2); assert.equal(chat.messages[0].delivery, "sent");
});

test("resending a restored draft recovers the failed turn even if creating the conversation failed", async () => {
  const app = setup(); let chat = await app.ready(); app.fail(new Error("network"));
  assert.equal(await chat.send("Need help"), false);
  chat = app.render(); assert.equal(chat.messages.length, 1); app.fail(null);
  const resend = chat.send("Need help"); await flush(); app.finish(); await resend;
  assert.equal(app.render().messages.length, 2);
  assert.equal(app.streams[0].payload.client_message_id, "message-1");
});

test("stop and deadline abort requests, remove typing state and retain a recoverable turn", async () => {
  for (const timedOut of [false, true]) {
    const app = setup(); const chat = await app.ready();
    const pending = chat.send("Check my order"); await flush();
    if (timedOut) [...app.timers.values()][0].callback(); else chat.stop();
    assert.equal(await pending, false);
    const stopped = app.render();
    assert.equal(stopped.busy, false); assert.equal(stopped.canRetry, true);
    assert.match(stopped.error, timedOut ? /longer than expected/ : /Reply stopped/);
  }
});

test("minimizing preserves an in-flight answer while unmount cancels it and rejects late updates", async () => {
  const app = setup(); const chat = await app.ready();
  const pending = chat.send("Check my order"); await flush(); app.render(false);
  assert.equal(app.streams[0].signal.aborted, false);
  app.unmount(); const updates = app.updates(); app.finish();
  assert.equal(await pending, false);
  assert.equal(app.streams[0].signal.aborted, true);
  assert.equal(app.updates(), updates);
});

test("401 and 403 clear private history and disable retries", async () => {
  for (const status of [401, 403]) {
    const app = setup(); const chat = await app.ready();
    const pending = chat.send("My wallet"); await flush(); app.streams[0].reject(Object.assign(new Error("Access denied"), { status }));
    await pending; const expired = app.render();
    assert.equal(expired.expired, true); assert.equal(expired.messages.length, 0);
    assert.equal(expired.conversations.length, 0); assert.equal(expired.active, null);
    assert.equal(expired.status, null); assert.equal(expired.canRetry, false);
  }
});

test("clear deletes the active owned conversation only once and resets the local transcript", async () => {
  const app = setup(); let chat = await app.ready(); const pending = chat.send("My wallet"); await flush(); app.finish(); await pending;
  chat = app.render(); const remove = chat.remove();
  assert.equal(await chat.remove(), false); assert.equal(await remove, true);
  assert.equal(app.calls.filter((call) => call.options.method === "DELETE").length, 1);
  chat = app.render(); assert.equal(chat.messages.length, 0); assert.equal(chat.active, null);
});
