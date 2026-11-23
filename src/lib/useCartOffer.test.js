import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("./useCartOffer.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "").replace("export default function", "function");
const tick = () => new Promise(setImmediate);
const automatic = { valid: true, offer: { code: "AUTO10", application_mode: "AUTOMATIC" }, discount_amount: 10, total: 108 };

function setup() {
  const slots = [], effects = [], requests = [];
  let cursor = 0, queue = [];
  const hook = runInNewContext(`${source}\nuseCartOffer`, {
    AbortController,
    requestJson(path, options) {
      return new Promise((resolve, reject) => requests.push({ path, options, body: JSON.parse(options.body), resolve, reject }));
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
        queue.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() }; });
      }
    },
  });
  let options = { restaurantId: "restaurant", items: [{ variant_id: "pasta", quantity: 1 }] };
  return { requests, render(next = {}) {
    options = { ...options, ...next };
    cursor = 0;
    const result = hook(options);
    const pending = queue; queue = []; pending.forEach((effect) => effect());
    return result;
  } };
}

test("automatic checkout obtains a quote without a code", async () => {
  const app = setup();
  assert.equal(app.render().busy, true);
  assert.equal(app.requests[0].body.offer_code, null);
  app.requests[0].resolve(automatic);
  await tick();
  assert.equal(app.render().ready, true);
  assert.equal(app.render().result.total, 108);
});

test("cart changes hide old savings and ignore late responses", async () => {
  const app = setup();
  app.render();
  const old = app.requests[0];
  const changed = app.render({ items: [{ variant_id: "pasta", quantity: 2 }] });
  assert.equal(changed.result, null);
  assert.equal(changed.busy, true);
  assert.equal(old.options.signal.aborted, true);
  app.requests[1].resolve({ ...automatic, total: 216 });
  await tick();
  old.resolve(automatic);
  await tick();
  assert.equal(app.render().result.total, 216);
});

test("invalid coupons fall back to the automatic discount with an explanation", async () => {
  const app = setup();
  const initial = app.render();
  initial.applyCoupon(" bad ");
  app.render();
  assert.equal(app.requests[1].body.offer_code, "BAD");
  app.requests[1].resolve({ valid: false, reason: "Minimum not met" });
  await tick();
  assert.equal(app.requests[2].body.offer_code, null);
  app.requests[2].resolve(automatic);
  await tick();
  const result = app.render();
  assert.equal(result.ready, true);
  assert.equal(result.result.discount_amount, 10);
  assert.equal(result.error, "Minimum not met");
});

test("removing a coupon recalculates the best automatic offer", async () => {
  const app = setup();
  app.render().applyCoupon("SAVE20");
  app.render();
  app.requests[1].resolve({ valid: true, offer: { code: "SAVE20", application_mode: "COUPON" }, total: 96 });
  await tick();
  app.render().clearCoupon();
  assert.equal(app.render().result, null);
  assert.equal(app.requests[2].body.offer_code, null);
  app.requests[2].resolve(automatic);
  await tick();
  assert.equal(app.render().result.offer.code, "AUTO10");
});

test("failed quotes block checkout and can be retried", async () => {
  const app = setup();
  app.render();
  app.requests[0].reject(new Error("Network unavailable"));
  await tick();
  const failed = app.render();
  assert.equal(failed.ready, false);
  assert.equal(failed.error, "Network unavailable");
  failed.refresh();
  assert.equal(app.render().busy, true);
  app.requests[1].resolve(automatic);
  await tick();
  assert.equal(app.render().ready, true);
  assert.equal(app.render().error, "");
});
