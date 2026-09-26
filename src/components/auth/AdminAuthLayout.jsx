import { CalendarDays, ShieldCheck, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminAuthLayout({ children }) {
  return (
    <main className="auth-shell admin-auth-shell">
      <section className="story admin-story">
        <div className="admin-story-overlay" />

        <div className="admin-brand">
          <Link to="/admin/login" className="brand">
            <span className="brand-mark">
              <Utensils size={15} />
            </span>
            <span>DineBook</span>
          </Link>
        </div>

        <div className="story-copy">
          <span className="eyebrow admin-eyebrow">
            <ShieldCheck size={11} />
            PORTAL ADMIN
          </span>

          <h1>Manage &amp; Audit the DineBook Platform</h1>

          <p>
            Monitor operations, manage platform activity, and maintain secure
            control over the DineBook ecosystem from one place.
          </p>
        </div>

        <footer>
          <CalendarDays size={12} />
          <span>© 2026 DineBook Premium Dining Network</span>
        </footer>
      </section>

      <section className="form-side admin-form-side">
        <div className="form-wrap admin-form-wrap">{children}</div>
      </section>
    </main>
  );
}
