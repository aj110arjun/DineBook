const roles = new Set(["admin", "manager", "chef", "customer"]);

export function validatePasswordChange({ current_password, new_password, confirm_password }) {
  if (!current_password) return "Enter your current password.";
  const length = Array.from(new_password).length;
  if (length < 8 || length > 128 || !/\p{L}/u.test(new_password) || !/[^\p{L}\s]/u.test(new_password)) {
    return "Use 8–128 characters, including a letter and a number or symbol.";
  }
  if (new_password !== confirm_password) return "Your new passwords do not match.";
  if (new_password === current_password) return "Choose a password different from your current password.";
  return "";
}

export function passwordChangeRequest(role, values) {
  if (!roles.has(role)) throw new Error("Unsupported account role.");
  const { current_password, new_password, confirm_password } = values;
  return {
    path: `/api/auth/${role}/change-password`,
    options: {
      method: "POST",
      body: role === "chef"
        ? { current_password, password: new_password, confirm_password }
        : { current_password, new_password, confirm_password },
    },
  };
}
