import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function ChefProtectedRoute({ children }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkChef(initial = false) {
      try {
        const chef = await requestJson("/api/chef/me", { method: "GET", fallbackMessage: "Chef authentication required." });
        if (active) { setMustChangePassword(Boolean(chef.must_change_password)); setAuthenticated(true); if (initial) setChecking(false); }
      } catch (error) {
        if (active) { setAuthenticated(false); setSuspended(/suspend/i.test(error.message)); setChecking(false); }
      }
    }
    checkChef(true);
    const timer = window.setInterval(() => checkChef(false), 2000);

    return () => { active = false; window.clearInterval(timer); };
  }, [location.pathname]);

  if (checking) {
    return <main className="landing-loading" aria-live="polite"><span className="loading-mark">D</span><p>Checking chef account…</p></main>;
  }
  if (!authenticated) return <Navigate to="/chef/login" replace state={{ notice: suspended ? "Your restaurant has been suspended. You have been signed out." : "Your session has ended. Please sign in again." }} />;
  if (mustChangePassword && location.pathname !== "/chef/change-password") {
    return <Navigate to="/chef/change-password" replace />;
  }
  if (!mustChangePassword && location.pathname === "/chef/change-password") {
    return <Navigate to="/chef/dashboard" replace />;
  }
  return children;
}
