import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_AVATAR_BYTES,
  normalizeProfile,
  profileForm,
  profilePatch,
  saveCustomerProfile,
  validateAvatar,
  validateProfile,
} from "./customerProfile.js";

const user = {
  id: "customer",
  name: "Asha Rao",
  phone: null,
  email: "asha@example.com",
  avatar_url: "https://example.com/old",
};

test("profile drafts are independent, normalize input, and cancel can restore the saved values", () => {
  const draft = profileForm(user);
  draft.name = "  Anne   O'Neil  ";
  draft.phone = "  +91 98765 43210  ";
  assert.deepEqual(normalizeProfile(draft), {
    name: "Anne O'Neil",
    phone: "+91 98765 43210",
  });
  assert.deepEqual(profileForm(user), { name: "Asha Rao", phone: "" });
  assert.deepEqual(profilePatch(user, profileForm(user)), {});
  assert.deepEqual(
    profilePatch({ ...user, phone: "+919876543210" }, profileForm(user)),
    { phone: null },
  );
});

test("client validation follows the existing name and international/regional phone conventions", () => {
  for (const name of ["", " ", "A", "x".repeat(121), "User123", "<script>"]) {
    assert.ok(validateProfile({ name, phone: "" }).name, name);
  }
  for (const phone of [
    "123",
    "+91 0000000000",
    "+91 987654321",
    "+91 98765432100",
    "000-0000",
    "abc9876543210",
  ]) {
    assert.ok(validateProfile({ name: "Asha Rao", phone }).phone, phone);
  }
  for (const phone of [
    "",
    "+91 98765 43210",
    "+(91) 9876543210",
    "0484-2345678",
    "+44 20 7946 0958",
  ]) {
    assert.deepEqual(validateProfile({ name: "Anne O'Neil", phone }), {});
  }
  assert.deepEqual(validateProfile({ name: "李 小龍", phone: "" }), {});
});

test("avatar selection rejects empty, oversize and unsupported images", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"])
    assert.equal(validateAvatar({ type, size: MAX_AVATAR_BYTES }), "");
  assert.ok(validateAvatar({ type: "image/png", size: MAX_AVATAR_BYTES + 1 }));
  assert.ok(validateAvatar({ type: "image/png", size: 0 }));
  assert.ok(validateAvatar({ type: "image/svg+xml", size: 200 }));
});

test("no changes trigger no API requests", async () => {
  const result = await saveCustomerProfile({
    current: user,
    form: profileForm(user),
    request: () => assert.fail("unexpected request"),
    onPersist: () => assert.fail("unexpected refresh"),
  });
  assert.equal(result, user);
});

test("details and photo save in order and refresh shared identity after each response", async () => {
  const calls = [];
  const updates = [];
  const file = new Blob(["preview content"], { type: "image/png" });
  const details = { ...user, name: "Anne O'Neil" };
  const photo = { ...details, avatar_url: "https://example.com/new" };
  const request = async (path, options) => {
    calls.push({ path, options });
    return options.method === "PATCH" ? details : photo;
  };
  const result = await saveCustomerProfile({
    current: user,
    form: { ...profileForm(user), name: "  Anne O'Neil " },
    file,
    request,
    onPersist: (value) => updates.push(value),
  });
  assert.deepEqual(
    calls.map(({ options }) => options.method),
    ["PATCH", "POST"],
  );
  assert.deepEqual(calls[0].options.body, { name: "Anne O'Neil" });
  assert.equal(calls[1].path, "/api/customer/profile/avatar");
  assert.equal(calls[1].options.body.get("image").type, "image/png");
  assert.deepEqual(updates, [details, photo]);
  assert.equal(result, photo);
});

test("upload failures retain saved details and retry only the pending photo", async () => {
  let current = user;
  const form = { name: "New Name", phone: "" };
  const file = new Blob(["photo"], { type: "image/webp" });
  let writes = 0;
  const request = async (_path, { method }) => {
    if (method === "PATCH") {
      writes++;
      return { ...user, name: form.name };
    }
    throw new Error("Photo upload unavailable");
  };
  for (let retry = 0; retry < 2; retry++) {
    await assert.rejects(
      saveCustomerProfile({
        current,
        form,
        file,
        request,
        onPersist: (value) => {
          current = value;
        },
      }),
      /Photo upload unavailable/,
    );
  }
  assert.equal(writes, 1);
  assert.equal(current.name, "New Name");
});

test("profile errors stop photo changes and are surfaced unchanged", async () => {
  let calls = 0;
  await assert.rejects(
    saveCustomerProfile({
      current: user,
      form: { name: "New Name", phone: "" },
      removeAvatar: true,
      request: async () => {
        calls++;
        const error = new Error("Please sign in");
        error.status = 401;
        throw error;
      },
      onPersist: () => assert.fail("failed writes must not refresh identity"),
    }),
    (error) => error.status === 401,
  );
  assert.equal(calls, 1);
});

test("staged avatar removal uses only the current-customer endpoint and refreshes identity", async () => {
  let refreshed;
  const result = await saveCustomerProfile({
    current: user,
    form: profileForm(user),
    removeAvatar: true,
    request: async (path, options) => {
      assert.equal(path, "/api/customer/profile/avatar");
      assert.equal(options.method, "DELETE");
      assert.equal(options.body, undefined);
      return { ...user, avatar_url: null };
    },
    onPersist: (value) => {
      refreshed = value;
    },
  });
  assert.equal(result.avatar_url, null);
  assert.equal(refreshed, result);
});
