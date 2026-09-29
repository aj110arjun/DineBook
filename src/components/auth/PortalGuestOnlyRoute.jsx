import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function PortalGuestOnlyRoute({ children, sessionPath, redirectTo, portalName }) {
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    requestJson(sessionPath, {
      method: "GET",
      fallbackMessage: "Unable to check portal session.",
    })
      .then(() => { if (active) setSignedIn(true); })
      .catch(() => { if (active) setSignedIn(false); })
      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; };
  }, [sessionPath]);

  if (checking) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking {portalName} session…</p>
      </main>
    );
  }

  if (signedIn) return <Navigate to={redirectTo} replace />;
  return children;
}
