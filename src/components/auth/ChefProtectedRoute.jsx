import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function ChefProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    requestJson("/api/chef/me", { method: "GET", fallbackMessage: "Chef authentication required." })
      .then(() => active && setAuthenticated(true))
      .catch(() => active && setAuthenticated(false))
      .finally(() => active && setChecking(false));

    return () => { active = false; };
  }, []);

  if (checking) {
    return <main className="landing-loading" aria-live="polite"><span className="loading-mark">D</span><p>Checking chef account…</p></main>;
  }
  if (!authenticated) return <Navigate to="/chef/login" replace />;
  return children;
}
