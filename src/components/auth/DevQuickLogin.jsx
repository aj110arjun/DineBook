import { useState } from "react";
import { requestJson } from "../../lib/authApi.js";

const TEST_PASSWORD = "DineBookTest!2026";

const TEST_ACCOUNTS = {
  customer: [
    {
      label: "Test Customer · Olive & Thyme",
      email: "test.dinebook.customer.olive@example.com",
    },
    {
      label: "Test Customer · Harbor Table",
      email: "test.dinebook.customer.harbor@example.com",
    },
  ],
  manager: [
    {
      label: "Test Manager · Olive & Thyme",
      email: "test.dinebook.manager.olive@example.com",
    },
    {
      label: "Test Manager · Harbor Table",
      email: "test.dinebook.manager.harbor@example.com",
    },
  ],
  chef: [
    {
      label: "Test Chef · Olive & Thyme",
      email: "test.dinebook.chef.olive@example.com",
    },
    {
      label: "Test Chef · Harbor Table",
      email: "test.dinebook.chef.harbor@example.com",
    },
  ],
};

/** Development-only one-click access to the local seeded portal accounts. */
export default function DevQuickLogin({ portal, onSuccess }) {
  const [busyEmail, setBusyEmail] = useState("");
  const [error, setError] = useState("");

  if (!import.meta.env.DEV || !TEST_ACCOUNTS[portal]) return null;

  async function signIn(account) {
    setError("");
    setBusyEmail(account.email);
    try {
      await requestJson(`/api/auth/${portal}/login`, {
        method: "POST",
        body: JSON.stringify({ email: account.email, password: TEST_PASSWORD }),
        fallbackMessage: `Could not sign in as ${account.label}.`,
      });
      onSuccess();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyEmail("");
    }
  }

  return (
    <section
      className="mt-6 rounded-xl border border-amber-200/20 bg-amber-100/[0.04] p-4"
      aria-label="Development test accounts"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
        Local test accounts
      </p>
      <div className="mt-3 grid gap-2">
        {TEST_ACCOUNTS[portal].map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => signIn(account)}
            disabled={Boolean(busyEmail)}
            className="flex min-h-10 items-center justify-between rounded-lg border border-white/10 px-3 text-left text-sm text-stone-200 transition hover:border-amber-200/50 hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-60"
          >
            <span>{account.label}</span>
            <span className="ml-3 text-xs text-amber-200">
              {busyEmail === account.email ? "Signing in…" : "Sign in →"}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
