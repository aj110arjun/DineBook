import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { demoSessionKey } from '../../data/demoCustomer.js';
import { requestJson } from '../../lib/authApi.js';

export default function GuestOnlyRoute({ children }) {
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === 'active') {
      setSignedIn(true);
      setChecking(false);
      return () => { active = false; };
    }

    requestJson('/api/customer/me')
      .then(() => { if (active) setSignedIn(true); })
      .catch(() => { if (active) setSignedIn(false); })
      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; };
  }, []);

  if (checking) {
    return <main className="landing-loading" aria-live="polite"><span className="loading-mark">D</span><p>Checking your account…</p></main>;
  }
  if (signedIn) return <Navigate to="/customer" replace />;
  return children;
}
