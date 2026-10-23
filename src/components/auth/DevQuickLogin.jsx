import { useState } from "react";
import { requestJson } from "../../lib/authApi.js";
import { demoSessionKey } from "../../data/demoCustomer.js";
import "./DevQuickLogin.css";

const TEST_PASSWORD = "DineBookDemo123!";
const RESTAURANTS = ["The Saffron Table", "Olive & Ember", "Coastal Kitchen", "The Garden Bistro (pending)"];
const TEST_ACCOUNTS = {
  customer: ["Aanya Sharma", "Rahul Menon", "Meera Nair", "Vikram Shah"].map((label, i) => ({
    label, email: `demo.customer${i + 1}@example.com`,
  })),
  manager: RESTAURANTS.map((name, i) => ({
    label: `Manager · ${name}`, email: `demo.manager${i + 1}@example.com`,
  })),
  chef: RESTAURANTS.flatMap((name, i) => [1, 2].map((chef) => ({
    label: `Chef ${chef} · ${name}`, email: `demo.chef${i + 1}${chef}@example.com`,
  }))),
  admin: [{ label: "Demo Administrator", email: "demo.admin@example.com" }],
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
      if (portal === "customer") sessionStorage.removeItem(demoSessionKey);
      onSuccess();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyEmail("");
    }
  }

  return (
    <section
      className="db-quick-login"
      aria-label="Development test accounts"
    >
      <p className="db-quick-login-title">
        One-click demo login
      </p>
      <p className="db-quick-login-description">Choose a test account to sign in instantly.</p>
      <div className="db-quick-login-accounts">
        {TEST_ACCOUNTS[portal].map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => signIn(account)}
            disabled={Boolean(busyEmail)}
            className="db-quick-login-account"
          >
            <span>{account.label}</span>
            <span className="db-quick-login-action">
              {busyEmail === account.email ? "Signing in…" : "Sign in →"}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="db-quick-login-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
