import { Component, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error("DineBook screen error", error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main id="main-content" className="ux-recovery" tabIndex={-1}>
        <span className="ux-eyebrow">DINEBOOK</span>
        <h1>This page couldn’t be displayed</h1>
        <p>Try reloading the page. If you were making a payment, check your reservations before paying again.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        <a href="/customer">Back to discover</a>
      </main>
    );
  }
}

export default function AppExperience() {
  const { pathname, hash } = useLocation();
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    // Wait for the new route to render without moving focus on background refreshes.
    const frame = window.requestAnimationFrame(() => {
      if (hash) {
        let id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch { /* Preserve malformed hashes as literal IDs. */ }
        const target = document.getElementById(id);
        target?.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      const heading = document.querySelector(".db-portal-main h1, main h1, .hero-banner h1, h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  function skip(event) {
    const target = document.querySelector(".db-portal-main, main, #discover");
    if (!target) return;
    event.preventDefault();
    target.setAttribute("tabindex", "-1");
    target.focus();
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }

  return <>
    <a className="ux-skip-link" href="#main-content" onClick={skip}>Skip to main content</a>
    {offline && <div className="ux-offline" role="status">You’re offline. Your current entries are still on this page. Reconnect before saving or paying.</div>}
  </>;
}

export function NotFoundPage() {
  return <main id="main-content" className="ux-recovery" tabIndex={-1}>
    <span className="ux-eyebrow">PAGE NOT FOUND</span>
    <h1>Let’s get you back to a table</h1>
    <p>This link may have changed. Browse restaurants or open your reservations to find what you need.</p>
    <Link to="/customer/restaurants">Find a restaurant</Link>
    <Link to="/customer/profile/reservations">My reservations</Link>
  </main>;
}
