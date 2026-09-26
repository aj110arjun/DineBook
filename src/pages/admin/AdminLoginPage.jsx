import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import AdminAuthLayout from "../../components/auth/AdminAuthLayout.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setError("");
    setSuccess("");
    setBusy(true);

    const form = new FormData(event.currentTarget);

    try {
      await requestJson("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email").trim().toLowerCase(),
          password: form.get("password"),
        }),
        fallbackMessage: "Invalid admin email or password.",
      });

      setSuccess("Admin sign-in successful.");

      window.setTimeout(() => {
        navigate("/admin/dashboard");
      }, 500);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminAuthLayout view="login">
      <h2 className="font-display text-3xl font-semibold text-ink">Sign In</h2>

      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        Sign in to access the DineBook administration portal.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          label="Admin Email Address"
          type="email"
          placeholder="admin@dinebook.com"
          autoComplete="email"
          icon={Mail}
          required
        />

        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your admin password"
          autoComplete="current-password"
          minLength={8}
          required
        />
        <div className="admin-login-options">
          <label className="admin-remember">
            <input type="checkbox" name="remember" />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            className="admin-forgot"
            onClick={() => {
              alert("Password recovery will be available soon.");
            }}
          >
            Forgot password?
          </button>
        </div>
        <Notice message={error} />
        <Notice message={success} type="success" />

        <button
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Access Administrator Console"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>
    </AdminAuthLayout>
  );
}
