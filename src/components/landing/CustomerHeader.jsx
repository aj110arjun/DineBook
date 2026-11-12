import useNavigationDisclosure from "../../hooks/useNavigationDisclosure.js";
import axios from "axios";
import { useState, useEffect } from "react";
import { MapPin, Menu, Utensils, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import NotificationSession from "../notifications/NotificationSession.jsx";
import NotificationBell from "../notifications/NotificationBell.jsx";

export default function CustomerHeader({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useNavigationDisclosure(
    menuOpen,
    () => setMenuOpen(false),
    "customer-primary-nav",
  );

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1281px)");

    function closeOnDsktop() {
      if (desktop.matches) setMenuOpen(false);
    }

    closeOnDsktop();
    desktop.addEventListener("change", closeOnDsktop);

    return () => {
      desktop.removeEventListener("change", closeOnDsktop);
    };
  }, []);

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
      await axios.request({
        url: `${API_BASE}/api/auth/logout`,
        validateStatus: () => true,
        method: "POST",
        withCredentials: true,
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

  const header = (
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
          <Link
            className="location-select"
            to="/customer/restaurants"
            onClick={closeMenu}
          >
            <MapPin size={15} aria-hidden="true" /> Find nearby
          </Link>

          {/* Navigation links */}
          <div className="nav-links">
            <Link
              className={location.pathname === "/customer" ? "active" : ""}
              aria-current={
                location.pathname === "/customer" ? "page" : undefined
              }
              to="/customer"
              onClick={closeMenu}
            >
              Discover
            </Link>

            <Link
              className={
                location.pathname.startsWith("/customer/restaurants")
                  ? "active"
                  : ""
              }
              aria-current={
                location.pathname.startsWith("/customer/restaurants")
                  ? "page"
                  : undefined
              }
              to="/customer/restaurants"
              onClick={closeMenu}
            >
              Restaurants
            </Link>

            {user && (
              <Link
                className={
                  location.pathname === "/customer/saved-restaurants"
                    ? "active"
                    : ""
                }
                aria-current={
                  location.pathname === "/customer/saved-restaurants"
                    ? "page"
                    : undefined
                }
                to="/customer/saved-restaurants"
                onClick={closeMenu}
              >
                Saved places
              </Link>
            )}
            {user && (
              <Link
                className={
                  location.pathname === "/customer/profile/reservations"
                    ? "active"
                    : ""
                }
                to="/customer/profile/reservations"
                onClick={closeMenu}
                aria-current={
                  location.pathname.startsWith("/customer/profile/reservations")
                    ? "page"
                    : undefined
                }
              >
                My reservations
              </Link>
            )}
          </div>

          {/* Account */}
          <div className="account-nav">
            {user ? (
              <>
                <NotificationBell role="customer" enabled={Boolean(user)} />

                <button
                  className="profile-button"
                  onClick={() => {
                    closeMenu();
                    navigate("/customer/profile");
                  }}
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

  return user && user.id !== demoCustomer.id ? (
    <NotificationSession key={user.id}>{header}</NotificationSession>
  ) : (
    header
  );
}
