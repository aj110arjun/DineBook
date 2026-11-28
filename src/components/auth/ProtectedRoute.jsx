import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import { requestJson } from "../../lib/authApi.js";
import { useDispatch } from "react-redux";
import {
  setCustomerSession,
  clearCustomerSession,
} from "../../state/customerSession.js";

let pendingSession;
function loadSession() {
  pendingSession ??= requestJson("/api/customer/me").finally(() => {
    pendingSession = null;
  });
  return pendingSession;
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const demo =
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active";

    // Check authenticated customer
    (demo ? Promise.resolve(demoCustomer) : loadSession())
      .then((user) => {
        if (active) {
          dispatch(setCustomerSession(user));
          setSignedIn(true);
        }
      })
      .catch((reason) => {
        if (active) {
          if (reason.status === 401 || reason.status === 403) {
            dispatch(clearCustomerSession());
            setSignedIn(false);
          } else {
            setError(reason.message || "Unable to load your account.");
          }
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
  }, [dispatch, attempt]);

  if (checking) {
    return (
      <main className="landing-loading" aria-live="polite">
        <span className="loading-mark">D</span>
        <p>Checking your account…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="landing-loading">
        <p role="alert">{error}</p>
        <button
          type="button"
          onClick={() => {
            setChecking(true);
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  if (!signedIn) {
    return <Navigate to="/customer/login" replace state={{ from: location }} />;
  }

  return children;
}
