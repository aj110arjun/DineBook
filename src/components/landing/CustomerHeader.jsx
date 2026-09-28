import { useState } from "react";
import { ChevronDown, MapPin, Menu, Utensils, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../../lib/authApi.js";
import { demoSessionKey } from "../../data/demoCustomer.js";

export default function CustomerHeader({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function signOut() {
    try {
      // Development demo session
      if (
        import.meta.env.DEV &&
        sessionStorage.getItem(demoSessionKey) === "active"
      ) {
        sessionStorage.removeItem(demoSessionKey);
        onLogout?.();
        return;
      }

      // Real backend logout
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Update the landing page state.
      // We intentionally DO NOT navigate to login.
      onLogout?.();
    }
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand */}
        <Link to="/customer" className="site-brand" onClick={closeMenu}>
          <span className="brand-mark">
            <Utensils size={15} />
          </span>
          DineBook
        </Link>

        {/* Mobile menu */}
        <button
          className="mobile-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="customer-primary-nav"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav
          id="customer-primary-nav"
          className={`main-nav${menuOpen ? " open" : ""}`}
          aria-label="Main navigation"
        >
          {/* Location */}
          <label className="location-select">
            <MapPin size={13} />

            <select aria-label="Choose location" defaultValue="Mumbai, BKC">
              <option>Mumbai, BKC</option>
              <option>Mumbai, Fort</option>
              <option>Mumbai, Bandra</option>
              <option>Dubai, DIFC</option>
            </select>

            <ChevronDown size={12} />
          </label>

          {/* Navigation links */}
          <div className="nav-links">
            <Link className={location.pathname === "/customer" ? "active" : ""} to="/customer" onClick={closeMenu}>
              Discover
            </Link>

            <Link className={location.pathname.startsWith("/customer/restaurants") ? "active" : ""} to="/customer/restaurants" onClick={closeMenu}>
              Restaurants
            </Link>

            <Link to="/customer#offers" onClick={closeMenu}>
              Offers
            </Link>

            <Link to="/customer#how-it-works" onClick={closeMenu}>
              Wallet
            </Link>
          </div>

          {/* Account */}
          <div className="account-nav">
            {user ? (
              <>
                <button className="text-button" onClick={signOut}>
                  Sign out
                </button>

                <button
                  className="profile-button"
                  onClick={() =>
                    document.querySelector("#voices")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  {user?.name?.split(" ")[0] || "Profile"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-button"
                  onClick={() => {
                    closeMenu();
                    navigate("/customer/login");
                  }}
                >
                  Login
                </button>

                <button
                  className="profile-button"
                  onClick={() => {
                    closeMenu();
                    navigate("/customer/register");
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
