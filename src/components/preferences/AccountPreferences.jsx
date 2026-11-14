import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { createAccountSettingsStore, DEFAULT_GENERAL, watchThemePreference } from "../../lib/customerSettings.js";
import { setAccountDateTimePreferences } from "../../lib/localDate.js";
import { clearCustomerSession } from "../../state/customerSession.js";

const AccountPreferences = createContext(null);
export const useAccountPreferences = () => useContext(AccountPreferences);

function deviceTheme() {
  try { return localStorage.getItem("dinebook-theme") === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export default function AccountPreferencesProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const customerId = useSelector((state) => state.customerSession.user?.id);
  const [managerId, setManagerId] = useState(null);
  const [chefId, setChefId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const customerRoute = pathname.startsWith("/customer") && !/^\/customer\/(login|register|recovery|verify-email)(\/|$)/.test(pathname);
  const managerRoute = pathname.startsWith("/manager/") && !/^\/manager\/(login|register|pending)(\/|$)/.test(pathname);
  const chefRoute = pathname.startsWith("/chef/") && !/^\/chef\/(login|change-password)(\/|$)/.test(pathname);
  const adminRoute = pathname.startsWith("/admin/") && !/^\/admin\/(login|recovery)(\/|$)/.test(pathname);
  const role = adminRoute ? "admin" : chefRoute ? "chef" : managerRoute ? "manager" : "customer";
  const accountId = adminRoute ? adminId : chefRoute ? chefId : managerRoute ? managerId : customerRoute ? customerId : null;
  const scope = accountId ? `${role}:${accountId}` : null;
  const store = useMemo(() => createAccountSettingsStore(requestJson, `/api/${role}/settings`), [scope, role]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const general = state.settings?.general || DEFAULT_GENERAL;
  const effectiveFormatting = scope ? general : null;
  const [formatting, setFormatting] = useState(null);

  useEffect(() => { if (!managerRoute) setManagerId(null); }, [managerRoute]);
  useEffect(() => { if (!chefRoute) setChefId(null); }, [chefRoute]);
  useEffect(() => { if (!adminRoute) setAdminId(null); }, [adminRoute]);
  useLayoutEffect(() => {
    setAccountDateTimePreferences(effectiveFormatting);
    setFormatting(effectiveFormatting);
  }, [effectiveFormatting]);
  useEffect(() => { if (scope) store.load(); }, [store, scope]);
  useEffect(() => {
    if (state.error?.status === 401 || state.error?.status === 403) {
      if (role === "admin") setAdminId(null);
      else if (role === "chef") setChefId(null);
      else if (role === "manager") setManagerId(null);
      else dispatch(clearCustomerSession());
      navigate(`/${role}/login`, { replace: true });
    }
  }, [state.error, dispatch, navigate, role]);
  useLayoutEffect(() => {
    const theme = scope ? general.theme : deviceTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    return watchThemePreference(theme, document.documentElement, media);
  }, [scope, general.theme]);

  return <AccountPreferences.Provider value={{ ...state, general, formatting, active: Boolean(scope), role, accountId,
    setManagerId, setChefId, setAdminId, load: store.load, save: store.save }}>
    {children}
  </AccountPreferences.Provider>;
}
