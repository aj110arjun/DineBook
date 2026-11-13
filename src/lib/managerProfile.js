import { getRestaurantPhoneError } from "./managerRegistrationValidation.js";

export const RESTAURANT_FIELDS = [
  { name: "name", label: "Restaurant name", maxLength: 255, required: true },
  { name: "cuisine_type", label: "Cuisine types", maxLength: 100 },
  { name: "email", label: "Contact email", type: "email", maxLength: 255 },
  { name: "phone", label: "Contact phone", type: "tel", maxLength: 20 },
  { name: "address", label: "Street address", maxLength: 500, required: true },
  { name: "city", label: "City", maxLength: 100, required: true },
  { name: "state", label: "State", maxLength: 100 },
  { name: "pin_code", label: "Postal code", maxLength: 10 },
  { name: "description", label: "Description", maxLength: 2000, multiline: true },
];

export function restaurantForm(restaurant) {
  return Object.fromEntries(RESTAURANT_FIELDS.map(({ name }) => [name, restaurant?.[name] || ""]));
}

export function restaurantPatch(current, form) {
  return Object.fromEntries(RESTAURANT_FIELDS.map(({ name }) => {
    let value = form[name].trim();
    if (name === "email") value = value.toLowerCase();
    else if (name !== "description") value = value.replace(/\s+/gu, " ");
    return [name, value || null];
  }).filter(([key, value]) => value !== (current[key] ?? null)));
}

export function validateRestaurant(current, form) {
  const errors = {};
  const patch = restaurantPatch(current, form);
  for (const { name, label, maxLength } of RESTAURANT_FIELDS) {
    if (!(name in patch)) continue;
    const value = patch[name];
    if (name !== "description" && name !== "email" && !value) errors[name] = `${label} cannot be blank.`;
    else if (value && (value.length > maxLength || (name !== "description" && name !== "email" && value.length < (name === "pin_code" ? 3 : name === "phone" ? 7 : 2)))) errors[name] = `${label} has an invalid length (up to ${maxLength} characters).`;
  }
  if (patch.name && !/^[\p{L}\p{N}\s'.-]+$/u.test(patch.name)) errors.name = "Use letters, numbers, spaces, apostrophes, hyphens, or periods.";
  if (patch.phone) errors.phone = getRestaurantPhoneError(patch.phone) || errors.phone;
  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) errors.email = "Enter a valid contact email.";
  if (patch.pin_code && !/^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/.test(patch.pin_code)) errors.pin_code = "Enter a valid PIN or ZIP code (3–10 characters).";
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export async function saveRestaurantProfile({ current, form, file, request, onPersist }) {
  const patch = restaurantPatch(current, form);
  if (Object.keys(patch).length) {
    current = await request("/api/manager/profile/restaurant", { method: "PATCH", body: patch, fallbackMessage: "Unable to save restaurant details." });
    onPersist(current);
  }
  if (file) {
    const body = new FormData();
    body.append("image", file);
    current = await request("/api/manager/profile/restaurant/branding-image", { method: "POST", body, fallbackMessage: "Unable to save the restaurant image." });
    onPersist(current);
  }
  return current;
}

export const profileStatus = (value) => value ? value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not provided";
