import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { AdminSessionContext } from "../admin/AdminSessionContext.jsx";
import NotificationSession from "../notifications/NotificationSession.jsx";
import { useAccountPreferences } from "../preferences/AccountPreferences.jsx";

export default function AdminProtectedRoute({ children }) {
  const { setAdminId } = useAccountPreferences();
  // undefined = checking; null = signed out; object = authenticated.
  const [admin, setAdmin] = useState(undefined);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setAdmin(undefined);
    setError("");

    requestJson("/api/auth/admin/me", {
      signal: controller.signal,
      timeout: 10000,
      fallbackMessage: "Unable to check administrator access.",
    })
      .then((account) => {
        if (!controller.signal.aborted) {
          setAdmin(account);
        }
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;

        if ([401, 403].includes(reason.status)) {
          setAdmin(null);
        } else {
          setError(reason.message);
        }
      });

    return () => controller.abort();
  }, [attempt]);

  const updateAdminProfile = useCallback((profile) => {
    setAdmin((current) =>
      current?.id === profile.id
        ? { ...current, ...profile }
        : current,
    );
  }, []);

  const clearAdmin = useCallback(() => {
    setAdmin(null);
  }, []);

  useEffect(() => {
    setAdminId(admin?.id ?? null);
    return () => setAdminId(null);
  }, [admin?.id, setAdminId]);

  if (error) {
    return (
      <main className="landing-loading">
        <p role="alert">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </main>
    );
  }

  if (admin === undefined) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking administrator access…</p>
      </main>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminSessionContext.Provider
      value={{ admin, updateAdminProfile, clearAdmin }}
    >
      <NotificationSession key={admin.id}>
        {children}
      </NotificationSession>
    </AdminSessionContext.Provider>
  );
}
