import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotificationDelivery } from "./notificationDelivery.js";

const startedAt = Date.parse("2026-11-08T08:00:00Z");
const credit = { id: "credit-1", title: "Wallet credited", message: "₹500.00 was credited to your wallet.", created_at: "2026-11-08T08:00:01Z" };

test("recovers a wallet toast missed by the live stream without replaying history", async () => {
  const delivered = [];
  const old = { ...credit, id: "old", created_at: "2026-11-08T07:59:59Z" };
  const delivery = createNotificationDelivery({ startedAt,
    request: async () => ({ items: [credit, old] }),
    onNotification: (item) => delivered.push(item),
  });
  await delivery.refresh();
  await delivery.receive(credit.id);
  await delivery.refresh();
  assert.deepEqual(delivered, [credit]);
  delivery.dispose();
});

test("recovers a failed detail fetch through the list API", async () => {
  const delivered = [];
  const delivery = createNotificationDelivery({ startedAt,
    request: async (path) => {
      if (!path.includes("?")) throw new Error("Temporary failure");
      return { items: [credit] };
    },
    onNotification: (item) => delivered.push(item),
  });
  await delivery.receive(credit.id);
  assert.deepEqual(delivered, [credit]);
  assert.equal(delivery.needsRecovery(), false);
  delivery.dispose();
});

test("retries temporary failures and handles UTC timestamps without a suffix", async () => {
  let available = false;
  const delivered = [];
  const item = { ...credit, created_at: "2026-11-08T08:00:01" };
  const delivery = createNotificationDelivery({ startedAt,
    request: async () => {
      if (!available) throw new Error("Offline");
      return { items: [item] };
    },
    onNotification: (notification) => delivered.push(notification),
  });
  await delivery.receive(item.id);
  assert.equal(delivery.needsRecovery(), true);
  available = true;
  await delivery.refresh();
  assert.deepEqual(delivered, [item]);
  delivery.dispose();
});

test("simultaneous live and REST delivery only toast once", async () => {
  const delivered = [];
  const delivery = createNotificationDelivery({ startedAt,
    request: async (path) => path.includes("?") ? { items: [credit] } : credit,
    onNotification: (item) => delivered.push(item),
  });
  await Promise.all([delivery.receive(credit.id), delivery.receive(credit.id), delivery.refresh()]);
  assert.deepEqual(delivered, [credit]);
  delivery.dispose();
});

test("unmount aborts pending requests and prevents late toasts", async () => {
  let finish;
  let signal;
  const delivered = [];
  const delivery = createNotificationDelivery({ startedAt,
    request: (_path, options) => {
      signal = options.signal;
      return new Promise((resolve) => { finish = resolve; });
    },
    onNotification: (item) => delivered.push(item),
  });
  const pending = delivery.receive(credit.id);
  delivery.dispose();
  assert.equal(signal.aborted, true);
  finish(credit);
  await pending;
  assert.deepEqual(delivered, []);
});
