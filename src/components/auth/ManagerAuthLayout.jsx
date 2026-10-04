import { CalendarDays, Store, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

export default function ManagerAuthLayout({ children }) {
  return (
    <main className="auth-shell manager-auth-shell">
      <section className="story manager-story">
        <div className="manager-story-overlay" />

        <div className="manager-brand">
          <Link to="/manager/register" className="brand">
            <span className="brand-mark">
              <Utensils size={15} />
            </span>
            <span>DineBook</span>
          </Link>
        </div>

        <div className="story-copy">
          <span className="eyebrow manager-eyebrow">
            <Store size={11} />
            PORTAL MANAGER
          </span>

          <h1>Manage Your Restaurant on DineBook</h1>

          <p>
            Create your manager account, submit your restaurant details, and
            manage your dining business after approval by the DineBook
            administration team.
          </p>
        </div>

        <footer>
          <CalendarDays size={12} />
          <span>© 2026 DineBook Premium Dining Network</span>
        </footer>
      </section>

      <section className="form-side manager-form-side">
        <div className="form-wrap manager-form-wrap">{children}</div>
      </section>
    </main>
  );
}
