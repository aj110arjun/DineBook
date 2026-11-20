import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import { CustomerHeaderFrame } from "../landing/CustomerHeader.jsx";
import PortalBreadcrumb from "../PortalBreadcrumb.jsx";

const CustomerShellContext = createContext(null);
export const useCustomerShell = () => useContext(CustomerShellContext);

export function CustomerHeaderRegistration({ user, breadcrumbLabel }) {
  const { setHeader } = useCustomerShell();
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    setHeader({ pathname, user, breadcrumbLabel });
  }, [pathname, user, breadcrumbLabel, setHeader]);
  return null;
}

export default function CustomerShell() {
  const user = useSelector((state) => state.customerSession.user);
  const { pathname } = useLocation();
  const [header, setHeader] = useState(null);
  const value = useMemo(() => ({ setHeader }), []);
  const current = header?.pathname === pathname ? header : null;
  return (
    <CustomerShellContext.Provider value={value}>
      <div className="customer-home customer-portal-shell">
        <CustomerHeaderFrame user={current?.user || user} />
        <PortalBreadcrumb
          entityLabel={current?.breadcrumbLabel}
          className="portal-breadcrumb customer-route-breadcrumb"
        />
        <Outlet />
      </div>
    </CustomerShellContext.Provider>
  );
}
