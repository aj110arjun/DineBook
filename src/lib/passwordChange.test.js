import test from "node:test";
import assert from "node:assert/strict";
import { passwordChangeRequest, validatePasswordChange } from "./passwordChange.js";

const values = () => ({ current_password: "Original123!", new_password: "Replacement456!", confirm_password: "Replacement456!" });

test("each portal sends the password fields accepted by its authenticated endpoint", () => {
  for (const role of ["admin", "manager", "chef", "customer"]) {
    const { path, options } = passwordChangeRequest(role, { ...values(), user_id: "another-account" });
    assert.equal(path, `/api/auth/${role}/change-password`);
    assert.equal(options.method, "POST");
    assert.deepEqual(options.body, role === "chef" ? {
      current_password: "Original123!", password: "Replacement456!", confirm_password: "Replacement456!",
    } : values());
    assert.equal(options.body.user_id, undefined);
  }
  assert.throws(() => passwordChangeRequest("unknown", values()), /Unsupported account role/);
});

test("current password, matching confirmation, and a different password are required", () => {
  assert.equal(validatePasswordChange(values()), "");
  assert.match(validatePasswordChange({ ...values(), current_password: "" }), /current password/);
  assert.match(validatePasswordChange({ ...values(), confirm_password: "Different789!" }), /do not match/);
  assert.match(validatePasswordChange({ ...values(), new_password: "Original123!", confirm_password: "Original123!" }), /different/);
});

test("password validation follows the server length and character requirements", () => {
  for (const password of ["short1", "Valid7!", "onlyletters", "12345678901", " ".repeat(12), "a1".repeat(65)]) {
    assert.match(validatePasswordChange({ ...values(), new_password: password, confirm_password: password }), /8–128 characters/);
  }
  for (const password of ["Fresh8!x", "Fresh8!xy", "a1".repeat(5), "a1".repeat(64), "नमस्तेAccount123!"]) {
    assert.equal(validatePasswordChange({ ...values(), new_password: password, confirm_password: password }), "");
  }
});
