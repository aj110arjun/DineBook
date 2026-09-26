import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

const commonPasswords = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "welcome1",
  "admin123",
  "iloveyou1",
  "abc12345",
  "p@ssw0rd",
  "passw0rd",
  "password1!",
  "qwerty123!",
  "welcome123!",
  "p@ssword1",
  "admin123!",
]);

function validateFullName(name) {
  return (
    name.length >= 2 &&
    [...name].every((char) => /[\p{L}\p{M}\s]/u.test(char)) &&
    /\p{L}/u.test(name)
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8)
    return "Use at least 8 characters for your password.";
  if (!/\p{Lu}/u.test(password))
    return "Add at least one uppercase letter to your password.";
  if (!/\p{Ll}/u.test(password))
    return "Add at least one lowercase letter to your password.";
  if (!/\p{Nd}/u.test(password))
    return "Add at least one number to your password.";
  if (![...password].some((char) => !/[\p{L}\p{N}]/u.test(char)))
    return "Add at least one special symbol to your password.";
  if (commonPasswords.has(password.toLowerCase()))
    return "Choose a less common password.";
  return "";
}

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = form.get("password");
    const confirmation = form.get("confirmPassword");
    const name = form.get("name").trim().replace(/\s+/gu, " ");
    const email = form.get("email").trim();
    if (!name) {
      setError("Please enter your full name.");
      return;
    }
    if (!validateFullName(name)) {
      setError("Full name must be at least 2 characters and contain letters and spaces only.");
      return;
    }
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Enter a valid email address, such as alex@example.com.");
      return;
    }
    if (!password) {
      setError("Please create a password.");
      return;
    }
    if (!confirmation) {
      setError("Please confirm your password.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError("Your passwords don’t match. Check both fields and try again.");
      return;
    }

    setBusy(true);
    try {
      await requestJson("/api/auth/customer/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: email.toLowerCase(),
          password,
          confirm_password: confirmation,
        }),
        fallbackMessage:
          "We couldn’t create the account. Please check your details.",
      });
      formElement.reset();
      sessionStorage.setItem('dinebook-verification-email', email.toLowerCase());
      navigate('/customer/verify-email', { state: { email: email.toLowerCase() } });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout view="register">
      <h2 className="font-display text-3xl font-semibold text-ink">
        Create Account
      </h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        Create your guest profile and start planning your next dining
        experience.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="name"
          label="Full Name"
          placeholder="Alex Morgan"
          autoComplete="name"
          minLength={2}
        />
        <FormField
          id="email"
          label="Email Address"
          type="email"
          placeholder="alex@example.com"
          autoComplete="email"
          icon={Mail}
        />
        <PasswordField
          id="password"
          label="Create Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
        />
        <p className="-mt-2 mb-4 text-xs leading-5 text-stone-500">
          Use 8 or more characters with uppercase and lowercase letters, a
          number, and a special symbol. Avoid common passwords.
        </p>
        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Enter your password again"
          autoComplete="new-password"
          minLength={8}
        />
        <Notice message={error} />
        <Notice message={success} type="success" />
        <button
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Creating your account…" : "Create Customer Account"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </form>
      <p className="mt-7 border-t border-stone-100 pt-5 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          className="font-semibold text-wine hover:underline"
          to="/customer/login"
        >
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
