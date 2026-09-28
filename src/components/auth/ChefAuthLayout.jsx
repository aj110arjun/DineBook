import { ChefHat, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

export default function ChefAuthLayout({ children }) {
  return (
    <main className="auth-shell manager-auth-shell chef-auth-shell">
      <section className="story manager-story chef-story">
        <div className="manager-story-overlay chef-story-overlay" />
        <div className="manager-brand">
          <Link to="/chef/login" className="brand">
            <span className="brand-mark"><Utensils size={15} /></span>
            <span>DineBook</span>
          </Link>
        </div>

        <div className="story-copy">
          <span className="eyebrow manager-eyebrow">
            <ChefHat size={12} /> CHEF PORTAL
          </span>
          <h1>Bring Your Kitchen to Life</h1>
          <p>Sign in to manage your kitchen profile and stay connected with the restaurants you serve.</p>
        </div>

        <footer>© 2026 DineBook Premium Dining Network</footer>
      </section>

      <section className="form-side manager-form-side">
        <div className="form-wrap manager-form-wrap">{children}</div>
      </section>
    </main>
  );
}
