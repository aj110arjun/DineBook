import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useCustomerPreferences } from "./customer/CustomerPreferences.jsx";

export default function ThemeToggle() {
  const preferences = useCustomerPreferences();
  const [error, setError] = useState("");
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.dataset.theme === "dark"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    setDark(document.documentElement.dataset.theme === "dark");
    return () => observer.disconnect();
  }, []);

  async function toggleTheme() {
    const nextDark = !dark;
    setError("");
    if (preferences?.active) {
      const saved = await preferences.save("general", "theme", nextDark ? "dark" : "light");
      if (!saved) setError("Unable to save theme. Please try again.");
      return;
    }
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    try { window.localStorage.setItem("dinebook-theme", nextDark ? "dark" : "light"); } catch { /* Apply for this visit. */ }
    setDark(nextDark);
  }

  return (
    <><span className="theme-toggle-error" role="alert">{error}</span><button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      disabled={preferences?.active && (!preferences.settings || preferences.loading || Boolean(preferences.pending))}
      aria-pressed={dark}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button></>
  );
}
