import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import ManagerAuthLayout from "../../components/auth/ManagerAuthLayout.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerLoginPage() {
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
      await requestJson("/api/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email").trim().toLowerCase(),
          password: form.get("password"),
        }),
        fallbackMessage: "Invalid manager email or password.",
      });

      setSuccess("Manager sign-in successful.");

      window.setTimeout(() => {
        navigate("/manager/dashboard");
      }, 500);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ManagerAuthLayout>
      <h2 className="font-display text-3xl font-semibold text-ink">
        Manager Sign In
      </h2>

      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        Sign in to access your DineBook restaurant management portal.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          label="Manager Email Address"
          type="email"
          placeholder="manager@restaurant.com"
          autoComplete="email"
          icon={Mail}
          required
        />

        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your manager password"
          autoComplete="current-password"
          minLength={8}
          required
        />

        <div className="mb-5 -mt-2 text-right text-xs">
          <Link className="font-medium text-wine hover:underline" to="/manager/recovery">Forgot password?</Link>
        </div>

        <Notice message={error} />
        <Notice message={success} type="success" />

        <button
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign In to Manager Portal"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Don't have a manager account?{" "}
        <Link
          to="/manager/register"
          className="font-semibold text-wine hover:text-ink"
        >
          Register
        </Link>
      </p>
    </ManagerAuthLayout>
  );
}
