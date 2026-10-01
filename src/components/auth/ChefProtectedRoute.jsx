import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function ChefProtectedRoute({ children }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let active = true;
    requestJson("/api/chef/me", { method: "GET", fallbackMessage: "Chef authentication required." })
      .then((chef) => {
        if (active) {
          setMustChangePassword(Boolean(chef.must_change_password));
          setAuthenticated(true);
        }
      })
      .catch(() => active && setAuthenticated(false))
      .finally(() => active && setChecking(false));

    return () => { active = false; };
  }, [location.pathname]);

  if (checking) {
    return <main className="landing-loading" aria-live="polite"><span className="loading-mark">D</span><p>Checking chef account…</p></main>;
  }
  if (!authenticated) return <Navigate to="/chef/login" replace />;
  if (mustChangePassword && location.pathname !== "/chef/change-password") {
    return <Navigate to="/chef/change-password" replace />;
  }
  if (!mustChangePassword && location.pathname === "/chef/change-password") {
    return <Navigate to="/chef/dashboard" replace />;
  }
  return children;
}
