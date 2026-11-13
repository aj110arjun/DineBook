import test from "node:test";
import assert from "node:assert/strict";
import { restaurantForm, restaurantPatch, saveRestaurantProfile, validateRestaurant } from "./managerProfile.js";
import { profileForm, saveAccountProfile } from "./customerProfile.js";

const restaurant = { id: "owned", name: "Real Kitchen", description: "Fresh food", cuisine_type: "Indian", email: "hello@example.com", phone: "+91 9876543210", address: "Main Street", city: "Pune", state: "Maharashtra", pin_code: "411001", status: "APPROVED" };

test("restaurant forms prepopulate independent drafts and normalize only permitted changes", () => {
  const form = restaurantForm(restaurant);
  assert.deepEqual(restaurantPatch(restaurant, form), {});
  form.name = "  New   Kitchen "; form.email = " CONTACT@EXAMPLE.COM ";
  assert.deepEqual(restaurantPatch(restaurant, form), { name: "New Kitchen", email: "contact@example.com" });
  assert.equal(restaurant.name, "Real Kitchen");
  assert.equal("status" in form, false);
  assert.equal("manager_id" in form, false);
});

test("unchanged missing legacy fields stay omitted and optional contact text can be cleared", () => {
  const missing = { ...restaurant, phone: null, state: null, cuisine_type: null, pin_code: null };
  assert.deepEqual(validateRestaurant(missing, restaurantForm(missing)), {});
  assert.deepEqual(restaurantPatch(missing, restaurantForm(missing)), {});
  const form = { ...restaurantForm(restaurant), email: "", description: "  " };
  assert.deepEqual(restaurantPatch(restaurant, form), { email: null, description: null });
});

test("restaurant client validation follows server lengths, phone and postal rules", () => {
  for (const [key, value] of [["name", ""], ["name", "<script>"], ["phone", "0000000"], ["email", "bad"], ["pin_code", "../x"], ["pin_code", "12345678901"], ["description", "a".repeat(2001)], ["address", " "]]) {
    assert.ok(validateRestaurant(restaurant, { ...restaurantForm(restaurant), [key]: value })[key], key);
  }
  assert.deepEqual(validateRestaurant(restaurant, { ...restaurantForm(restaurant), name: "李 Kitchen", pin_code: "SW1A 1AA", phone: "+44 20 7946 0958" }), {});
});

test("saving unchanged restaurant details makes no request", async () => {
  assert.equal(await saveRestaurantProfile({ current: restaurant, form: restaurantForm(restaurant), request: () => assert.fail("unexpected request"), onPersist: () => assert.fail("unexpected update") }), restaurant);
});

test("restaurant detail and image changes save in order and report each persisted response", async () => {
  const calls = [], persisted = [];
  const file = new Blob(["fixture"], { type: "image/png" });
  const result = await saveRestaurantProfile({ current: restaurant, form: { ...restaurantForm(restaurant), name: "New Kitchen" }, file,
    request: async (path, options) => { calls.push({ path, options }); return options.method === "PATCH" ? { ...restaurant, name: "New Kitchen" } : { ...restaurant, name: "New Kitchen", branding_image_url: "https://example.com/new.png" }; },
    onPersist: (value) => persisted.push(value) });
  assert.deepEqual(calls.map(({ path }) => path), ["/api/manager/profile/restaurant", "/api/manager/profile/restaurant/branding-image"]);
  assert.deepEqual(calls[0].options.body, { name: "New Kitchen" });
  assert.equal(calls[1].options.body.get("image").type, "image/png");
  assert.equal(persisted.length, 2);
  assert.equal(result.branding_image_url, "https://example.com/new.png");
});

test("an image failure preserves successful restaurant edits and retry only uploads the image", async () => {
  let current = restaurant, patches = 0;
  const form = { ...restaurantForm(restaurant), name: "New Kitchen" };
  for (let n = 0; n < 2; n++) {
    await assert.rejects(saveRestaurantProfile({ current, form, file: new Blob(["image"]),
      request: async (_path, options) => { if (options.method === "PATCH") { patches++; return { ...restaurant, name: "New Kitchen" }; } throw new Error("Image unavailable"); },
      onPersist: (value) => { current = value; } }), /Image unavailable/);
  }
  assert.equal(patches, 1);
  assert.equal(current.name, "New Kitchen");
});

test("failed details do not upload images and preserve authentication errors", async () => {
  let requests = 0;
  const error = Object.assign(new Error("Expired session"), { status: 401 });
  await assert.rejects(saveRestaurantProfile({ current: restaurant, form: { ...restaurantForm(restaurant), name: "New Kitchen" }, file: new Blob(["image"]),
    request: async () => { requests++; throw error; }, onPersist: () => assert.fail("No successful update") }), (reason) => reason === error);
  assert.equal(requests, 1);
});

test("manager personal edits reuse the shared profile flow with manager-specific endpoints", async () => {
  const current = { name: "Manager Name", phone: null, avatar_url: "https://example.com/avatar.png" };
  const calls = [];
  await saveAccountProfile({ current, form: { ...profileForm(current), name: "Updated Manager" }, removeAvatar: true, basePath: "/api/manager/profile",
    request: async (path, options) => { calls.push([path, options]); return { ...current, name: "Updated Manager", avatar_url: options.method === "DELETE" ? null : current.avatar_url }; }, onPersist: () => {} });
  assert.deepEqual(calls.map(([path]) => path), ["/api/manager/profile", "/api/manager/profile/avatar"]);
  assert.deepEqual(calls[0][1].body, { name: "Updated Manager" });
  assert.equal(calls[1][1].method, "DELETE");
});
