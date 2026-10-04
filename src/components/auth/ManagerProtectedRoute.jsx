import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const hadSession = useRef(false);

  useEffect(() => {
    let active = true;

    async function checkManager(initial = false) {
      try {
        await requestJson("/api/auth/manager/me", {
          method: "GET",
          fallbackMessage: "Manager authentication required.",
        });

        if (active) {
          setAuthenticated(true);
          hadSession.current = true;
          if (initial) setChecking(false);
        }
      } catch (error) {
        if (active) {
          setAuthenticated(false);
          setSuspended(/suspend/i.test(error.message));
          // A direct visit to a protected URL with no cookie is simply a sign-in
          // redirect, not an expired session. `hadSession` distinguishes that
          // from a cookie expiring after this guard confirmed authentication.
          setChecking(false);
        }
      }
    }

    checkManager(true);
    const timer = window.setInterval(() => checkManager(false), 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (checking) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking manager account…</p>
      </main>
    );
  }

  if (!authenticated) {
    const notice = suspended
      ? "Your restaurant has been suspended. You have been signed out."
      : hadSession.current
        ? "Your session has ended. Please sign in again."
        : undefined;
    return <Navigate to="/manager/login" replace state={notice ? { notice } : null} />;
  }

  return children;
}
