import test from "node:test";
import assert from "node:assert/strict";
import { isCoupon, isCurrentOffer, offersForFood, offerSavingLabel, displayOffersForFood, appliedOfferIds, appliedOfferLabel } from "./foodOffers.js";

const offer = { id: "offer", status: "ACTIVE", is_active: true, applicability: "RESTAURANT", application_mode: "AUTOMATIC", discount_type: "PERCENTAGE", discount_percent: 10 };
const food = { id: "pasta", category_id: "mains", name: "Pasta" };

test("restaurant, category and food offers appear only on matching dishes", () => {
  const rows = [offer, { ...offer, id: "category", applicability: "CATEGORIES", eligible_category_ids: ["mains"] },
    { ...offer, id: "item", applicability: "ITEMS", eligible_food_ids: ["pasta"] },
    { ...offer, id: "other", applicability: "ITEMS", eligible_food_ids: ["salad"] }];
  assert.deepEqual(offersForFood(rows, food).map((row) => row.id), ["offer", "category", "item"]);
  assert.deepEqual(offersForFood(rows, { id: "salad" }, "starters").map((row) => row.id), ["offer", "other"]);
});

test("scheduled, expired, exhausted and customer-limited offers are hidden", () => {
  const now = Date.now();
  for (const extra of [{ status: "SCHEDULED" }, { is_active: false }, { remaining_uses: 0 }, { customer_remaining_uses: 0 },
    { ends_at: new Date(now - 1000).toISOString() }, { starts_at: new Date(now + 10000).toISOString() }]) {
    assert.equal(isCurrentOffer({ ...offer, ...extra }, now), false);
  }
  assert.equal(isCurrentOffer(offer, now), true);
});

test("coupons are distinct from automatic offers and use clear saving labels", () => {
  assert.equal(isCoupon(offer), false);
  assert.equal(isCoupon({ ...offer, application_mode: "COUPON" }), true);
  assert.equal(offerSavingLabel(offer), "10% off");
  assert.equal(offerSavingLabel({ ...offer, discount_type: "FIXED", discount_percent: 75 }), "₹75.00 off");
});

test("a food badge shows the highest automatic saving without stacking category and item offers", () => {
  const category = { ...offer, id: "category", discount_percent: 20, applicability: "CATEGORIES", eligible_category_ids: ["mains"] };
  const item = { ...offer, id: "item", discount_percent: 30, applicability: "ITEMS", eligible_food_ids: ["pasta"] };
  const dish = { ...food, variants: [{ price: 100, is_available: true }] };
  assert.deepEqual(displayOffersForFood([category, item], dish).map((row) => row.id), ["item"]);
  assert.deepEqual(displayOffersForFood([category, item], { ...dish, id: "salad" }).map((row) => row.id), ["category"]);
  assert.deepEqual(displayOffersForFood([{ ...category, discount_percent: 40 }, item], dish).map((row) => row.id), ["category"]);
});

test("checkout marks all winning offers while keeping the total label clear", () => {
  const result = { valid: true, offer: { id: "item", title: "Item deal" }, applied_offers: [
    { id: "item", title: "Item deal" }, { id: "category", title: "Category deal" },
  ] };
  assert.deepEqual(appliedOfferIds(result), ["item", "category"]);
  assert.equal(appliedOfferLabel(result), "Automatic offers");
  assert.deepEqual(appliedOfferIds({ valid: false, offer: result.offer }), []);
  assert.equal(appliedOfferLabel({ valid: true, offer: result.offer }), "Item deal");
});
