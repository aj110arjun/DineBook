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

export function CustomerHeaderRegistration({ user, breadcrumbLabel, breadcrumbLabels }) {
  const { setHeader } = useCustomerShell();
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    setHeader({ pathname, user, breadcrumbLabel, breadcrumbLabels });
  }, [pathname, user, breadcrumbLabel, breadcrumbLabels, setHeader]);
  return null;
}

// Customer pages share one route-aware breadcrumb. Keeping this adapter here
// means a page never needs to recreate its own Home / Restaurants trail.
export function CustomerBreadcrumb({ entityLabel, entityLabels }) {
  return (
    <PortalBreadcrumb
      entityLabel={entityLabel}
      entityLabels={entityLabels}
      className="portal-breadcrumb customer-route-breadcrumb"
    />
  );
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
        <CustomerBreadcrumb
          entityLabel={current?.breadcrumbLabel}
          entityLabels={current?.breadcrumbLabels}
        />
        <Outlet />
      </div>
    </CustomerShellContext.Provider>
  );
}
