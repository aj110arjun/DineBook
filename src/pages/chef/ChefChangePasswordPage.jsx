import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChefAuthLayout from "../../components/auth/ChefAuthLayout.jsx";
import { PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ChefChangePasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    if (password !== form.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await requestJson("/api/auth/chef/change-password", {
        method: "POST",
        body: JSON.stringify({ password }),
        fallbackMessage: "Unable to update your password.",
      });
      navigate("/chef/dashboard", { replace: true });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChefAuthLayout>
      <h2 className="font-display text-3xl font-semibold text-ink">Change your password</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">Choose a new password to finish setting up your chef account.</p>
      <form onSubmit={handleSubmit}>
        <PasswordField id="password" label="New Password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} maxLength={128} required />
        <PasswordField id="confirmPassword" label="Confirm New Password" placeholder="Enter the new password again" autoComplete="new-password" minLength={8} maxLength={128} required />
        <Notice message={error} />
        <button className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-60" type="submit" disabled={busy}>
          {busy ? "Updating password…" : "Save New Password"}
        </button>
      </form>
    </ChefAuthLayout>
  );
}
