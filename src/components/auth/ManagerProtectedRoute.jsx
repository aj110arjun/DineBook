import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkManager() {
      try {
        await requestJson("/api/auth/manager/me", {
          method: "GET",
          fallbackMessage: "Manager authentication required.",
        });

        if (active) {
          setAuthenticated(true);
        }
      } catch {
        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    checkManager();

    return () => {
      active = false;
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
    return <Navigate to="/manager/login" replace />;
  }

  return children;
}
