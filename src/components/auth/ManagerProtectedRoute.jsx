import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerProtectedRoute({ children }) {
  const [state, setState] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function checkManagerSession() {
      try {
        await requestJson("/api/auth/manager/me", {
          method: "GET",
          fallbackMessage: "Manager session expired.",
        });

        if (mounted) {
          setState("authenticated");
        }
      } catch {
        if (mounted) {
          setState("unauthenticated");
        }
      }
    }

    checkManagerSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (state === "loading") {
    return <div className="auth-loading">Checking manager session…</div>;
  }

  if (state === "unauthenticated") {
    return <Navigate to="/manager/login" replace />;
  }

  return children;
}
