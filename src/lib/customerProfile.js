export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function profileForm(user) {
  return { name: user?.name || "", phone: user?.phone || "" };
}

export function normalizeProfile(form) {
  return {
    name: form.name.trim().replace(/\s+/gu, " "),
    phone: form.phone.trim() || null,
  };
}

export function validateProfile(form) {
  const { name, phone } = normalizeProfile(form);
  const errors = {};
  if (name.length < 2 || name.length > 120) {
    errors.name = "Full name must contain 2–120 characters.";
  } else if (!/^[\p{L}\s'.-]+$/u.test(name)) {
    errors.name =
      "Use letters, spaces, apostrophes, hyphens, and periods for your name.";
  }
  if (phone) {
    const digits = phone.replace(/[^0-9]/g, "");
    if (
      phone.length < 7 ||
      phone.length > 20 ||
      digits.length < 7 ||
      digits.length > 15 ||
      !/^\+?(?:[0-9]|\([0-9]+\))(?:[ -]?(?:[0-9]|\([0-9]+\)))*$/.test(phone) ||
      /^0+$/.test(digits)
    ) {
      errors.phone =
        "Enter 7–15 digits; +, spaces, hyphens, and parentheses are allowed (20 characters max).";
    } else if (
      phone.startsWith("+") &&
      digits.startsWith("91") &&
      !/^91[1-9][0-9]{9}$/.test(digits)
    ) {
      errors.phone = "Enter exactly 10 digits after +91, starting with 1–9.";
    }
  }
  return errors;
}

export function validateAvatar(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Choose a JPEG, PNG, or WebP photo.";
  }
  if (!file.size || file.size > MAX_AVATAR_BYTES)
    return "Choose a photo of 5 MB or smaller.";
  return "";
}

export function profilePatch(current, form) {
  const values = normalizeProfile(form);
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => value !== (current[key] ?? null),
    ),
  );
}

// Persist each successful response immediately. If the second request fails, a retry
// only needs to save the outstanding photo change and the shared identity stays accurate.
export async function saveCustomerProfile({
  current,
  form,
  file,
  removeAvatar,
  request,
  onPersist,
}) {
  const patch = profilePatch(current, form);
  if (Object.keys(patch).length) {
    current = await request("/api/customer/profile", {
      method: "PATCH",
      body: patch,
      fallbackMessage: "Unable to save your profile.",
    });
    onPersist(current);
  }
  if (file) {
    const body = new FormData();
    body.append("image", file);
    current = await request("/api/customer/profile/avatar", {
      method: "POST",
      body,
      fallbackMessage: "Unable to save your profile photo.",
    });
    onPersist(current);
  } else if (removeAvatar && current.avatar_url) {
    current = await request("/api/customer/profile/avatar", {
      method: "DELETE",
      fallbackMessage: "Unable to remove your profile photo.",
    });
    onPersist(current);
  }
  return current;
}
