import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Run the actual hook's effects with lightweight React/EventSource doubles.
// This exercises the shared connection without requiring a browser or DOM.
const source = readFileSync(new URL("./useRealtimeEvents.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");

function setup() {
  const connections = [];
  const cleanups = [];
  const statuses = [];
  class EventSource {
    constructor(url, options) { this.url = url; this.options = options; this.listeners = new Map(); this.closed = false; connections.push(this); }
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    close() { this.closed = true; }
    emit(type, event = {}) { this.listeners.get(type)?.(event); }
  }
  const api = runInNewContext(`${source}\n({ useRealtimeEvents, refreshRealtimeSession })`, {
    API_BASE: "", URL, EventSource,
    window: { location: { href: "http://localhost/admin/settings" }, clearTimeout() {}, setTimeout() {} },
    useRef: (current) => ({ current }),
    useState: (initial) => [initial, (status) => statuses.push(status)],
    useEffect: (effect) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
  });
  return { api, connections, cleanups, statuses };
}

test("renewed credentials replace the live stream and ignore the old session's expiry event", () => {
  const { api, connections, cleanups } = setup();
  let refreshes = 0;
  api.useRealtimeEvents({ onReady: () => { refreshes++; } });
  const previous = connections[0];
  previous.emit("stream.ready", { lastEventId: "old-cursor" });
  api.refreshRealtimeSession();
  assert.equal(previous.closed, true);
  assert.equal(connections.length, 2);
  assert.equal(connections[1].options.withCredentials, true);
  assert.equal(connections[1].url, "http://localhost/api/events/stream");
  previous.emit("auth.expired");
  assert.equal(connections[1].closed, false);
  connections[1].emit("stream.ready");
  assert.equal(refreshes, 2);
  cleanups.forEach((cleanup) => cleanup());
});

test("password session refresh recovers an expired stream and does not connect without subscribers", () => {
  const { api, connections, cleanups, statuses } = setup();
  api.refreshRealtimeSession();
  assert.equal(connections.length, 0);
  api.useRealtimeEvents();
  connections[0].emit("auth.expired");
  api.refreshRealtimeSession();
  assert.equal(connections.length, 2);
  assert.equal(statuses.at(-1), "connecting");
  cleanups.forEach((cleanup) => cleanup());
  api.refreshRealtimeSession();
  assert.equal(connections.length, 2);
});
