import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function AdminProtectedRoute({ children }) {
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    requestJson("/api/auth/admin/me")
      .then(() => {
        if (active) {
          setSignedIn(true);
        }
      })
      .catch(() => {
        if (active) {
          setSignedIn(false);
        }
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking administrator access…</p>
      </main>
    );
  }

  if (!signedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
