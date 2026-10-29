import { test } from "node:test";
import assert from "node:assert/strict";
import { getFieldError, getFormErrors } from "./formValidation.js";

function field(overrides = {}) {
  return {
    willValidate: true, value: "", name: "Name", validity: {},
    minLength: -1, maxLength: -1, dataset: {}, getAttribute: () => null,
    ...overrides,
  };
}

test("required fields reject empty and whitespace-only input", () => {
  assert.equal(getFieldError(field({ required: true, value: "  " })), "Name is required.");
  assert.equal(getFieldError(field({ validity: { valueMissing: true } })), "Name is required.");
});

test("disabled and non-validating controls are ignored", () => {
  assert.equal(getFieldError(field({ disabled: true, required: true })), "");
  assert.equal(getFieldError(field({ willValidate: false, required: true })), "");
});

test("email, pattern, numeric range and step errors use custom messages", () => {
  assert.equal(getFieldError(field({ type: "email", validity: { typeMismatch: true } })), "Enter a valid email address.");
  assert.equal(getFieldError(field({ validity: { patternMismatch: true }, dataset: { patternMessage: "Use six digits." } })), "Use six digits.");
  assert.equal(getFieldError(field({ min: "1", validity: { rangeUnderflow: true } })), "Name must be at least 1.");
  assert.equal(getFieldError(field({ max: "10", validity: { rangeOverflow: true } })), "Name must be no more than 10.");
  assert.equal(getFieldError(field({ step: "0.5", validity: { stepMismatch: true } })), "Name must use increments of 0.5.");
});

test("length constraints also validate programmatically assigned values", () => {
  assert.equal(getFieldError(field({ value: "abc", minLength: 6 })), "Name must be at least 6 characters.");
  assert.equal(getFieldError(field({ value: "abcdefg", maxLength: 6 })), "Name must be 6 characters or fewer.");
  assert.equal(getFieldError(field({ minLength: 6 })), "");
});

test("form validation returns all errors in focus order without invoking browser popups", () => {
  const first = field({ required: true });
  const second = field({ value: "valid" });
  const third = field({ type: "number", validity: { badInput: true } });
  const errors = getFormErrors({ elements: [first, second, third] });
  assert.deepEqual(errors.map(({ field }) => field), [first, third]);
});

test("empty submission reports every missing required field together", () => {
  const fields = ["Start date", "End date", "Public reason", "Internal note"].map(
    (name) => field({ name, required: true, validity: { valueMissing: true } }),
  );
  const errors = getFormErrors({ elements: fields });
  assert.deepEqual(errors.map(({ message }) => message), [
    "Start date is required.",
    "End date is required.",
    "Public reason is required.",
    "Internal note is required.",
  ]);
});
