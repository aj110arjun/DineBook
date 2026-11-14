import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getManagerRegistrationStepErrors, getRestaurantPhoneError,
  getRestaurantContactErrors, formatRestaurantPhoneNumber,
} from "./managerRegistrationValidation.js";

function validRegistration() {
  const pdf = { type: "application/pdf", size: 1024 };
  return {
    application: {
      name: "Arjun Kumar", email: "manager@example.com",
      restaurantName: "Dine House", restaurantDescription: "Fresh local food.",
      cuisineType: "Indian", restaurantCountryCode: "+91", restaurantContact: "98765 43210",
      address: "12 Market Road", city: "Kochi", state: "Kerala", pinCode: "682001",
    },
    credentials: { password: "Restaurant123", confirmPassword: "Restaurant123" },
    emailVerified: true,
    documents: {
      fssaiLicense: pdf, businessRegistration: pdf, ownerIdentity: pdf,
      gstCertificate: null, brandingImages: { type: "image/jpeg", size: 1024 },
    },
    hours: { monday: { enabled: true, open: "17:00", close: "22:00" } },
    interiorMedia: null,
  };
}

test("each valid step can continue independently of incomplete later steps", () => {
  const data = validRegistration();
  for (const step of [1, 2, 3, 4]) {
    assert.deepEqual(getManagerRegistrationStepErrors(step, data), {});
  }
  data.documents = {};
  assert.deepEqual(getManagerRegistrationStepErrors(1, data), {});
  assert.deepEqual(getManagerRegistrationStepErrors(2, data), {});
});

test("personal details report all errors together before continuing", () => {
  const data = validRegistration();
  data.application.name = " ";
  data.emailVerified = false;
  data.credentials = { password: "short", confirmPassword: "different" };
  const errors = getManagerRegistrationStepErrors(1, data);
  assert.deepEqual(Object.keys(errors), ["name", "email", "password", "confirmPassword"]);
  assert.match(errors.email, /Verify your email/);
  assert.match(errors.confirmPassword, /do not match/);
});

test("blur validation catches name symbols and password complexity", () => {
  const data = validRegistration();
  data.application.name = "Manager123";
  data.credentials.password = "onlyletters";
  const errors = getManagerRegistrationStepErrors(1, data);
  assert.match(errors.name, /Use letters/);
  assert.match(errors.password, /number or symbol/);
});

test("registration accepts eight-character passwords and rejects shorter passwords", () => {
  const data = validRegistration();
  for (const password of ["Fresh8!x", "Fresh8!xy", "a1".repeat(64)]) {
    data.credentials = { password, confirmPassword: password };
    assert.deepEqual(getManagerRegistrationStepErrors(1, data), {});
  }
  for (const password of ["Valid7!", "a1".repeat(65)]) {
    data.credentials = { password, confirmPassword: password };
    assert.match(getManagerRegistrationStepErrors(1, data).password, /8–128 characters/);
  }
});

test("restaurant details report required and format errors in one pass", () => {
  const data = validRegistration();
  for (const field of Object.keys(data.application)) data.application[field] = " ";
  const errors = getManagerRegistrationStepErrors(2, data);
  assert.deepEqual(Object.keys(errors).sort(), [
    "restaurantName", "restaurantDescription", "cuisineType", "address", "city",
    "state", "restaurantCountryCode", "restaurantContact", "pinCode",
  ].sort());
  data.application.restaurantDescription = "x".repeat(2001);
  data.application.restaurantName = "Dine @ House";
  const invalid = getManagerRegistrationStepErrors(2, data);
  assert.match(invalid.restaurantDescription, /2000/);
  assert.match(invalid.restaurantName, /Use letters/);
});

test("document step requires every mandatory upload before continuing", () => {
  const data = validRegistration();
  data.documents = {};
  assert.deepEqual(Object.keys(getManagerRegistrationStepErrors(3, data)), [
    "fssaiLicense", "businessRegistration", "ownerIdentity", "brandingImages",
  ]);
});

test("document step checks file types and size, including optional files", () => {
  const data = validRegistration();
  data.documents.fssaiLicense = { type: "image/png", size: 1024 };
  data.documents.gstCertificate = { type: "application/pdf", size: 5 * 1024 * 1024 + 1 };
  data.documents.brandingImages = { type: "image/jpeg", size: 10 * 1024 * 1024 + 1 };
  const errors = getManagerRegistrationStepErrors(3, data);
  assert.match(errors.fssaiLicense, /file type/);
  assert.match(errors.gstCertificate, /5 MB/);
  assert.match(errors.brandingImages, /10 MB/);
});

test("operating hours step can continue without seating capacity or table counts", () => {
  assert.deepEqual(getManagerRegistrationStepErrors(4, validRegistration()), {});
});

test("operating hours step rejects missing enabled times and invalid interior media", () => {
  const data = validRegistration();
  data.hours.monday.open = "";
  data.interiorMedia = { type: "application/pdf", size: 1024 };
  const errors = getManagerRegistrationStepErrors(4, data);
  assert.match(errors.mondayHours, /opening and closing times/);
  assert.match(errors.interiorMedia, /file type/);
  data.hours.monday.enabled = false;
  assert.equal(getManagerRegistrationStepErrors(4, data).mondayHours, undefined);
});

test("correcting invalid values clears errors before reaching review", () => {
  const data = validRegistration();
  data.application.restaurantContact = "123";
  assert.ok(getManagerRegistrationStepErrors(2, data).restaurantContact);
  data.application.restaurantContact = "98765 43210";
  assert.deepEqual(getManagerRegistrationStepErrors(2, data), {});
});

test("phone validation rejects zeros and malformed Indian numbers immediately and at step validation", () => {
  const data = validRegistration();
  for (const value of [
    "+91 00000000000", "+91 0000000000", "+(91) 0000000000", "0000000000", "000-0000",
    "+91 987654321", "+91 98765432100", "+91 0987654321", "", " ", "abc9876543210",
  ]) {
    const error = getRestaurantPhoneError(value);
    assert.ok(error, value);
    data.application.restaurantContact = value;
    assert.ok(getManagerRegistrationStepErrors(2, data).restaurantContact, value);
  }
});

test("phone validation accepts formatted mobile, landline and international numbers", () => {
  for (const value of [
    "+91 98765 43210", "+919876543210", "+(91) 9876543210", "+91 (484) 2345678",
    "0484-2345678", "9876543210", "+44 20 7946 0958", "  +91 98765 43210  ",
  ]) {
    assert.equal(getRestaurantPhoneError(value), "", value);
  }
});

test("separate country code and national number validate together", () => {
  assert.deepEqual(getRestaurantContactErrors("+91", "98765 43210"), {});
  assert.deepEqual(getRestaurantContactErrors("+44", "20 7946 0958"), {});
  assert.ok(getRestaurantContactErrors("+44", "0000000000").restaurantContact);
  for (const number of ["00000000000", "0000000000", "987654321", "+91 9876543210", ""]) {
    assert.ok(getRestaurantContactErrors("+91", number).restaurantContact, number);
  }
  for (const code of ["", "91", "+", "+0", "+1234", "+ab"]) {
    assert.ok(getRestaurantContactErrors(code, "9876543210").restaurantCountryCode, code);
  }
});

test("changing the country code rechecks the national number", () => {
  assert.ok(getRestaurantContactErrors("+91", "30 1234567").restaurantContact);
  assert.deepEqual(getRestaurantContactErrors("+49", "30 1234567"), {});
});

test("review and submission combine both fields with a single country code", () => {
  assert.equal(formatRestaurantPhoneNumber("+91", "98765 43210"), "+91 98765 43210");
  assert.equal(formatRestaurantPhoneNumber(" +44 ", " 20 7946 0958 "), "+44 20 7946 0958");
  const data = validRegistration();
  data.application.restaurantCountryCode = "";
  assert.ok(getManagerRegistrationStepErrors(2, data).restaurantCountryCode);
});
