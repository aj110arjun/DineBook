// Limit the stored length and digit count before checking the formatting.
const phoneNumberFormat = String.raw`\+?(?:[0-9]|\([0-9]+\))(?:[ \-]?(?:[0-9]|\([0-9]+\)))*`;
export const restaurantPhonePattern = String.raw`\s*(?=.{7,20}\s*$)(?=(?:[^0-9]*[0-9]){7,15}[^0-9]*$)${phoneNumberFormat}\s*`;
const restaurantPhoneRegex = new RegExp(`^${restaurantPhonePattern}$`);
export const restaurantPhoneError =
  "Enter 7–15 digits. A leading +, spaces, hyphens, and parentheses are allowed (20 characters max).";

export function getRestaurantPhoneError(value) {
  const phone = value.trim();
  if (!phone) return "Restaurant phone number is required.";
  if (!restaurantPhoneRegex.test(phone)) return restaurantPhoneError;

  const digits = phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("+") && digits.startsWith("91") && !/^91[1-9][0-9]{9}$/.test(digits)) {
    return "Enter a valid +91 phone number with exactly 10 digits after the country code, starting with 1–9.";
  }
  if (/^0+$/.test(digits)) return "Enter a valid phone number; it cannot contain only zeros.";
  return "";
}

export function formatRestaurantPhoneNumber(countryCode, number) {
  return [countryCode.trim(), number.trim()].filter(Boolean).join(" ");
}

export function getRestaurantContactErrors(countryCode, number) {
  const errors = {};
  const code = countryCode.trim();
  if (!/^\+[1-9][0-9]{0,2}$/.test(code)) {
    errors.restaurantCountryCode = "Enter a country code such as +91 or +44.";
  }

  if (!number.trim()) {
    errors.restaurantContact = "Restaurant phone number is required.";
  } else if (number.includes("+")) {
    errors.restaurantContact = "Enter the country code in the separate Country Code field.";
  } else if (/^0+$/.test(number.replace(/[^0-9]/g, ""))) {
    errors.restaurantContact = "Enter a valid phone number; it cannot contain only zeros.";
  } else {
    const error = getRestaurantPhoneError(
      errors.restaurantCountryCode ? number : formatRestaurantPhoneNumber(code, number),
    );
    if (error) errors.restaurantContact = error;
  }
  return errors;
}

export function isManagerEmailVerified(email, verification, now = Date.now()) {
  return Boolean(
    typeof verification?.verification_token === "string" &&
    verification.verification_token.length > 0 &&
    typeof verification.email === "string" &&
    verification.email.trim().toLowerCase() === email.trim().toLowerCase() &&
    Date.parse(verification.expires_at) > now,
  );
}

export function getManagerRegistrationStepErrors(stepNumber, {
  application,
  credentials,
  emailVerification,
  documents,
  hours,
  interiorMedia,
}) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function checkLength(field, label, minimum, maximum) {
    const value = application[field].trim();

    if (!value) {
      errors[field] = `${label} is required.`;
    } else if (value.length < minimum || value.length > maximum) {
      errors[field] =
        `${label} must contain ${minimum}–${maximum} characters.`;
    }
  }

  function checkFile(field, file, label, types, maxMB, required = false) {
    if (!file) {
      if (required) errors[field] = `Upload ${label}.`;
      return;
    }

    if (!types.includes(file.type)) {
      errors[field] = `${label}: choose a valid file type.`;
    } else if (file.size > maxMB * 1024 * 1024) {
      errors[field] = `${label} must be ${maxMB} MB or smaller.`;
    }
  }

  if (stepNumber === 1) {
    checkLength("name", "Full name", 2, 120);

    if (
      application.name.trim() &&
      !/^[\p{L}\s'.-]+$/u.test(application.name.trim())
    ) {
      errors.name = "Use letters, spaces, apostrophes, hyphens, or periods.";
    }

    if (!emailPattern.test(application.email.trim())) {
      errors.email = "Enter a valid email address.";
    } else if (!isManagerEmailVerified(application.email, emailVerification)) {
      errors.email = "Verify your email before continuing.";
    }

    const { password, confirmPassword } = credentials;

    if (password.length < 8 || password.length > 128) {
      errors.password = "Password must contain 8–128 characters.";
    } else if (!/\p{L}/u.test(password) || !/[^\p{L}\s]/u.test(password)) {
      errors.password = "Include a letter and a number or symbol.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  if (stepNumber === 2) {
    checkLength("restaurantName", "Restaurant name", 2, 255);
    checkLength("restaurantDescription", "Description", 1, 2000);
    checkLength("cuisineType", "Cuisine type", 2, 100);
    checkLength("address", "Address", 2, 500);
    checkLength("city", "City", 2, 100);
    checkLength("state", "State", 2, 100);

    if (
      application.restaurantName.trim() &&
      !/^[\p{L}\p{N}\s'.-]+$/u.test(application.restaurantName.trim())
    ) {
      errors.restaurantName =
        "Use letters, numbers, spaces, apostrophes, hyphens, or periods.";
    }

    Object.assign(errors, getRestaurantContactErrors(
      application.restaurantCountryCode, application.restaurantContact,
    ));

    if (
      !/^[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]$/.test(
        application.pinCode.trim(),
      )
    ) {
      errors.pinCode = "Enter a valid PIN or ZIP code.";
    }
  }

  if (stepNumber === 3) {
    const pdfTypes = ["application/pdf"];
    const imageTypes = ["image/jpeg", "image/png"];

    checkFile(
      "fssaiLicense",
      documents.fssaiLicense,
      "your FSSAI or food safety document",
      pdfTypes,
      5,
      true,
    );

    checkFile(
      "businessRegistration",
      documents.businessRegistration,
      "your business registration certificate",
      pdfTypes,
      5,
      true,
    );

    checkFile(
      "ownerIdentity",
      documents.ownerIdentity,
      "your owner identity proof",
      pdfTypes,
      5,
      true,
    );

    checkFile(
      "gstCertificate",
      documents.gstCertificate,
      "your GST certificate",
      pdfTypes,
      5,
    );

    checkFile(
      "brandingImages",
      documents.brandingImages,
      "your cropped restaurant banner",
      imageTypes,
      10,
      true,
    );
  }

  if (stepNumber === 4) {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    Object.entries(hours).forEach(([day, schedule]) => {
      if (
        schedule.enabled &&
        (!timePattern.test(schedule.open) ||
          !timePattern.test(schedule.close))
      ) {
        errors[`${day}Hours`] = `Enter opening and closing times for ${day}.`;
      }
    });

    checkFile(
      "interiorMedia",
      interiorMedia,
      "your interior image",
      ["image/jpeg", "image/png"],
      10,
    );
  }

  if (stepNumber !== 1 && !isManagerEmailVerified(application.email, emailVerification)) {
    errors.email = "Verify your email before continuing.";
  }

  return errors;
}

