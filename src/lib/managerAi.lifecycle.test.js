import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../hooks/useManagerAi.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "").replace("export default function", "function");

function setup() {
  const slots = [], effects = [], turns = [], timers = new Map();
  let cursor = 0, effectQueue = [], chat, nextId = 0, timerId = 0, updates = 0;
  const hook = runInNewContext(`${source}\nuseManagerAi`, {
    AbortController, SUPPORT_REPLY_TIMEOUT_MS: 125000,
    supportMessageId: () => `message-${++nextId}`,
    supportDraftError: (value) => value.trim() ? "" : "empty", managerAiError: (reason) => reason.message,
    managerAiJson: (path, options) => {
      if (path === "/status") return Promise.resolve({ ready: true, restaurant_id: "restaurant", model_available: true, reply_timeout_seconds: 245 });
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(Object.assign(new Error("cancelled"), { name: "AbortError" })), { once: true });
        turns.push({ ...options, resolve, reject });
      });
    },
    window: { setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; }, clearTimeout: (id) => timers.delete(id) },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { updates++; slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!effects[index] || deps.some((value, n) => !Object.is(value, effects[index].deps[n]))) effectQueue.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() }; });
    },
  });
  const render = (open = false) => { cursor = 0; chat = hook("manager", open); const queue = effectQueue; effectQueue = []; queue.forEach((effect) => effect()); return chat; };
  render();
  return { render, turns, timers, updates: () => updates,
    async ready() { await chat.refresh(); return render(); },
    unmount() { effects.forEach((effect) => effect?.cleanup?.()); },
    finish(index = turns.length - 1, extra = {}) {
      const turn = turns[index];
      turn.resolve({ message_id: `answer-${turn.body.client_message_id}`, client_message_id: turn.body.client_message_id,
        restaurant_id: "restaurant", reply: "Recorded information", cards: [], as_of: "2026-11-16T12:00:00Z", context: { action: "revenue", period: "today" }, ...extra });
    },
  };
}

test("rapid clicks submit once, honor the server timeout, and retain follow-up context", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Revenue today", "revenue");
  assert.equal(await chat.send("Duplicate"), false);
  assert.equal(app.turns.length, 1); assert.equal([...app.timers.values()][0].ms, 245000);
  app.finish(); assert.equal(await sent, true); chat = app.render();
  assert.deepEqual(Array.from(chat.messages, (message) => message.sender), ["user", "assistant"]);
  const followup = chat.send("What about yesterday?");
  assert.equal(app.turns[1].body.context.action, "revenue");
  assert.deepEqual(Array.from(app.turns[1].body.history), ["Revenue today"]);
  app.finish(); await followup; app.unmount();
});

test("failed replies retry the original message without duplicate user bubbles", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Orders", "orders"); app.turns[0].reject(new Error("offline"));
  assert.equal(await sent, false); chat = app.render(); assert.equal(chat.messages[0].delivery, "failed");
  const retry = chat.retry(); assert.equal(app.turns[1].body.client_message_id, app.turns[0].body.client_message_id);
  app.finish(); await retry; chat = app.render();
  assert.equal(chat.messages.length, 2); assert.equal(chat.messages[0].delivery, "sent"); assert.equal(chat.canRetry, false);
  app.unmount();
});

test("minimizing preserves in-flight work, while unmount aborts it without late updates", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Summary"); app.render(false); assert.equal(app.turns[0].signal.aborted, false);
  app.finish(); await sent; chat = app.render(); assert.equal(chat.messages.length, 2);
  const next = chat.send("Orders"); app.unmount(); const count = app.updates();
  assert.equal(app.turns[1].signal.aborted, true); await next; assert.equal(app.updates(), count);
});

test("expiry clears restaurant facts and prevents further submissions", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Wallet"); app.turns[0].reject(Object.assign(new Error("Sign in again"), { status: 401 }));
  await sent; chat = app.render();
  assert.equal(chat.expired, true); assert.equal(chat.messages.length, 0); assert.equal(chat.conversations.length, 0);
  assert.equal(await chat.send("Wallet"), false); app.unmount();
});

test("responses for another restaurant are rejected", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Wallet"); app.finish(0, { restaurant_id: "another-restaurant" });
  assert.equal(await sent, false); chat = app.render();
  assert.equal(chat.messages.length, 0); assert.equal(chat.expired, true); app.unmount();
});

test("new chats, switching and clearing affect only the chosen session chat", async () => {
  const app = setup(); let chat = await app.ready();
  const first = chat.send("Orders"); app.finish(); await first; chat = app.render(); const firstId = chat.active;
  chat.newConversation(); chat = app.render(); assert.equal(chat.messages.length, 0);
  const second = chat.send("Wallet"); app.finish(); await second; chat = app.render(); assert.equal(chat.conversations.length, 2);
  chat.select(firstId); chat = app.render(); assert.equal(chat.messages[0].content, "Orders");
  assert.equal(await chat.remove(), true); chat = app.render(); assert.equal(chat.conversations.length, 1); assert.equal(chat.messages.length, 0);
  app.unmount();
});

test("stop and timeout release the submission lock and leave a retryable message", async () => {
  const app = setup(); let chat = await app.ready();
  const sent = chat.send("Summary"); chat.stop(); await sent; chat = app.render();
  assert.equal(chat.busy, false); assert.match(chat.error, /stopped/); assert.equal(chat.canRetry, true);
  const retry = chat.retry(); [...app.timers.values()][0].callback(); await retry; chat = app.render();
  assert.match(chat.error, /longer than expected/); assert.equal(chat.busy, false); app.unmount();
});
