import { useState } from "react";
import { ArrowRight, Mail, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import ManagerAuthLayout from "../../components/auth/ManagerAuthLayout.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerRegisterPage() {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);

    const name = form.get("name").trim();
    const email = form.get("email").trim().toLowerCase();
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const response = await requestJson("/api/auth/manager/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
        fallbackMessage: "Unable to create manager account.",
      });

      setSuccess(
        response?.message ||
          "Registration submitted successfully. Please wait for admin approval.",
      );

      event.currentTarget.reset();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ManagerAuthLayout>
      <h2 className="font-display text-3xl font-semibold text-ink">
        Create Manager Account
      </h2>

      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        Register your account to request access to the DineBook manager portal.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          name="name"
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          autoComplete="name"
          icon={User}
          minLength={2}
          maxLength={120}
          required
        />

        <FormField
          id="email"
          name="email"
          label="Email Address"
          type="email"
          placeholder="manager@restaurant.com"
          autoComplete="email"
          icon={Mail}
          required
        />

        <PasswordField
          id="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <Notice message={error} />
        <Notice message={success} type="success" />

        <button
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Submitting…" : "Create Manager Account"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have a manager account?{" "}
        <Link
          to="/manager/login"
          className="font-semibold text-wine hover:text-ink"
        >
          Sign in
        </Link>
      </p>
    </ManagerAuthLayout>
  );
}
