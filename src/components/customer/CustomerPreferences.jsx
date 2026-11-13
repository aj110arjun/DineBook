import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { createCustomerSettingsStore, DEFAULT_GENERAL, watchThemePreference } from "../../lib/customerSettings.js";
import { setCustomerDateTimePreferences } from "../../lib/localDate.js";
import { clearCustomerSession } from "../../state/customerSession.js";

const CustomerPreferences = createContext(null);
export const useCustomerPreferences = () => useContext(CustomerPreferences);

function deviceTheme() {
  try { return localStorage.getItem("dinebook-theme") === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export default function CustomerPreferencesProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const customerId = useSelector((state) => state.customerSession.user?.id);
  const customerRoute = pathname.startsWith("/customer") && !/^\/customer\/(login|register|recovery|verify-email)(\/|$)/.test(pathname);
  const scope = customerRoute ? customerId : null;
  const store = useMemo(() => createCustomerSettingsStore(requestJson), [scope]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const general = state.settings?.general || DEFAULT_GENERAL;

  const effectiveFormatting = customerRoute && scope ? general : null;
  const [formatting, setFormatting] = useState(null);
  // Synchronize shared formatters before painting, then refresh route displays.
  // Non-React consumers, including invoice exports, share these same defaults.
  useLayoutEffect(() => {
    setCustomerDateTimePreferences(effectiveFormatting);
    setFormatting(effectiveFormatting);
  }, [effectiveFormatting]);

  useEffect(() => { if (scope) store.load(); }, [store, scope]);
  useEffect(() => {
    if (state.error?.status === 401 || state.error?.status === 403) {
      dispatch(clearCustomerSession());
      navigate("/customer/login", { replace: true });
    }
  }, [state.error, dispatch, navigate]);
  useLayoutEffect(() => {
    const theme = customerRoute && scope ? general.theme : deviceTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    return watchThemePreference(theme, document.documentElement, media);
  }, [customerRoute, scope, general.theme]);

  return <CustomerPreferences.Provider value={{ ...state, general, formatting, active: Boolean(scope), load: store.load, save: store.save }}>
    {children}
  </CustomerPreferences.Provider>;
}
