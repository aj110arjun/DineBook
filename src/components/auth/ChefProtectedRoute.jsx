import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import NotificationSession from "../notifications/NotificationSession.jsx";
import { useAccountPreferences } from "../preferences/AccountPreferences.jsx";

const SESSION_CHECK_INTERVAL = 50000;

export default function ChefProtectedRoute() {
  const preferences = useAccountPreferences();
  const { pathname } = useLocation();
  const [chef, setChef] = useState(undefined);
  const [suspended, setSuspended] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const pendingCheck = useRef(null);

  useEffect(() => {
    let active = true;
    let timer;

    async function checkChef() {
      // Share a pending check when React replays the effect in development.
      // A password change starts a fresh check with the new session cookie.
      if (pendingCheck.current?.version !== sessionVersion) {
        pendingCheck.current = {
          version: sessionVersion,
          request: requestJson("/api/chef/me", {
            timeout: 10000,
            fallbackMessage: "Chef authentication required.",
          }),
        };
      }
      const check = pendingCheck.current;
      try {
        const profile = await check.request;
        if (active) {
          setChef(profile);
          timer = window.setTimeout(checkChef, SESSION_CHECK_INTERVAL);
        }
      } catch (error) {
        if (active) {
          setSuspended(/suspend/i.test(error.message));
          setChef(null);
        }
      } finally {
        if (pendingCheck.current === check) pendingCheck.current = null;
      }
    }
    checkChef();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [sessionVersion]);

  useEffect(() => {
    preferences?.setChefId(chef && !chef.must_change_password && pathname !== "/chef/change-password" ? chef.id : null);
  }, [chef?.id, chef?.must_change_password, pathname, preferences?.setChefId]);

  function refreshChef() {
    setChef(undefined);
    setSessionVersion((version) => version + 1);
  }

  if (chef === undefined) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking chef account…</p>
      </main>
    );
  }
  if (!chef)
    return (
      <Navigate
        to="/chef/login"
        replace
        state={{
          notice: suspended
            ? "Your restaurant has been suspended. You have been signed out."
            : "Your session has ended. Please sign in again.",
        }}
      />
    );
  if (chef.must_change_password && pathname !== "/chef/change-password") {
    return <Navigate to="/chef/change-password" replace />;
  }
  if (!chef.must_change_password && pathname === "/chef/change-password") {
    return <Navigate to="/chef/dashboard" replace />;
  }
  const outlet = <Outlet context={{ chef, refreshChef }} />;
  return chef.must_change_password ? outlet : (
    <NotificationSession key={chef.id}>{outlet}</NotificationSession>
  );
}
