import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ChefAuthLayout from "../../components/auth/ChefAuthLayout.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ChefLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function validateField(name, value) {
    if (name === "email") {
      if (!value.trim()) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
        return "Enter a valid email address, such as chef@example.com.";
      }
    }
    if (name === "password") {
      if (!value) return "Enter your password.";
      if (value.length > 128) return "Password must be 128 characters or fewer.";
    }
    return "";
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setError("");
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: validateField(name, value) }));
    }
  }

  function handleFieldBlur(event) {
    const { name, value } = event.target;
    setFieldErrors((current) => ({ ...current, [name]: validateField(name, value) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      email: form.get("email") || "",
      password: form.get("password") || "",
    };
    const nextErrors = Object.fromEntries(
      Object.entries(values).map(([name, value]) => [name, validateField(name, value)]),
    );
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      event.currentTarget.querySelector(`[name="${Object.keys(nextErrors).find((name) => nextErrors[name])}"]`)?.focus();
      return;
    }
    setError("");
    setBusy(true);

    try {
      await requestJson("/api/auth/chef/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email").trim().toLowerCase(),
          password: form.get("password"),
        }),
        fallbackMessage: "Invalid chef email or password.",
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
      <h2 className="font-display text-3xl font-semibold text-ink">Chef Sign In</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        Sign in to access your DineBook kitchen portal.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="email"
          name="email"
          label="Chef Email Address"
          type="email"
          placeholder="chef@restaurant.com"
          autoComplete="email"
          icon={Mail}
          required={false}
          error={fieldErrors.email}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
        />
        <PasswordField
          id="password"
          label="Password"
          placeholder="Enter your chef password"
          autoComplete="current-password"
          maxLength={128}
          required={false}
          error={fieldErrors.password}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
        />
        <Notice message={error} />
        <button
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Enter Kitchen Dashboard"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>
    </ChefAuthLayout>
  );
}
