import test from "node:test";
import assert from "node:assert/strict";
import { getPreorderCartDetails, mergePreorderVariants } from "./preorderMenu.js";

const starters = [{
  id: "salad", name: "Salad", category_id: "starters", category_name: "Starters",
  variants: [{ id: "small-salad", name: "Small", price: 125.5 }],
}];
const mains = [{
  id: "curry", name: "Curry", category_id: "mains", category_name: "Mains",
  variants: [{ id: "regular-curry", name: "Regular", price: 250 }],
}];

test("cart totals and offer eligibility survive menu page and filter changes", () => {
  const firstPage = mergePreorderVariants({}, starters);
  const cart = [{ variant_id: "small-salad", quantity: 2 }];
  const nextPage = mergePreorderVariants(firstPage, mains);
  // Loading a filtered empty page must also leave the selection intact.
  const noMatches = mergePreorderVariants(nextPage, []);
  assert.equal(getPreorderCartDetails(cart, noMatches).subtotal, 251);
  cart.push({ variant_id: "regular-curry", quantity: 1 });
  const details = getPreorderCartDetails(cart, noMatches);
  assert.equal(details.subtotal, 501);
  assert.deepEqual([...details.foodIds], ["salad", "curry"]);
  assert.deepEqual([...details.categoryIds], ["starters", "mains"]);
  assert.equal(noMatches["small-salad"].food_name, "Salad");
  assert.equal(firstPage["regular-curry"], undefined);
});

test("removing a selection removes its price and offer scope, even while cached", () => {
  const variants = mergePreorderVariants(mergePreorderVariants({}, starters), mains);
  const details = getPreorderCartDetails([{ variant_id: "regular-curry", quantity: 3 }], variants);
  assert.equal(details.subtotal, 750);
  assert.deepEqual([...details.foodIds], ["curry"]);
  assert.deepEqual([...details.categoryIds], ["mains"]);
  assert.equal(getPreorderCartDetails([], variants).subtotal, 0);
});

test("revisiting a page refreshes option metadata without losing other selections", () => {
  const cached = mergePreorderVariants(mergePreorderVariants({}, starters), mains);
  const refreshed = mergePreorderVariants(cached, [{
    ...starters[0], variants: [{ ...starters[0].variants[0], price: 150 }],
  }]);
  const cart = [{ variant_id: "small-salad", quantity: 2 }, { variant_id: "regular-curry", quantity: 1 }];
  assert.equal(getPreorderCartDetails(cart, refreshed).subtotal, 550);
  assert.equal(cached["small-salad"].price, 125.5);
  assert.equal(refreshed["regular-curry"].price, 250);
});
