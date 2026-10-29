export function getFieldError(field) {
  if (field.disabled || !field.willValidate) return "";

  const labelNode = field.labels?.[0]?.cloneNode(true);
  labelNode
    ?.querySelectorAll(
      "input, select, textarea, button, .custom-field-error-anchor",
    )
    .forEach((node) => node.remove());

  const label =
    field.getAttribute("aria-label") ||
    labelNode?.textContent?.replace(/\s+/g, " ").trim() ||
    field.name?.replace(/([a-z])([A-Z])/g, "$1 $2") ||
    "This field";
  const value = field.value;
  const validity = field.validity;

  if (validity.valueMissing || (field.required && !value.trim()))
    return field.type === "checkbox"
      ? `Please accept ${label}.`
      : `${label} is required.`;
  if (validity.badInput) return `${label} must be a valid number.`;

  if (validity.typeMismatch)
    return field.type === "email"
      ? "Enter a valid email address."
      : `Enter a valid ${label}.`;

  if (value && field.minLength > 0 && value.length < field.minLength)
    return `${label} must be at least ${field.minLength} characters.`;

  if (value && field.maxLength >= 0 && value.length > field.maxLength)
    return `${label} must be ${field.maxLength} characters or fewer.`;

  if (validity.rangeUnderflow) return `${label} must be at least ${field.min}.`;

  if (validity.rangeOverflow)
    return `${label} must be no more than ${field.max}.`;

  if (validity.stepMismatch)
    return `${label} must use increments of ${field.step || "1"}.`;

  if (validity.patternMismatch)
    return field.dataset.patternMessage || `Enter a valid ${label}.`;

  if (validity.customError) return field.validationMessage;
  return "";
}

export function getFormErrors(form) {
  return Array.from(form.elements).flatMap((field) => {
    const message = getFieldError(field);
    return message ? [{ field, message }] : [];
  });
}
