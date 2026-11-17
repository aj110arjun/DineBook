import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import PageTransition from "./PageTransition.jsx";
import PortalBreadcrumb from "../PortalBreadcrumb.jsx";
import { breadcrumbsFor } from "../../lib/routeMetadata.js";

const ShellContext = createContext(null);
export function usePortalShell() { return useContext(ShellContext); }

// Existing page wrappers keep their API; the actual frame lives at the route level.
export function PortalPage({ title, breadcrumbLabel, children }) {
  const shell = usePortalShell();
  const { pathname } = useLocation();
  useLayoutEffect(() => { shell.setPage({ pathname, title, breadcrumbLabel }); }, [shell.setPage, pathname, title, breadcrumbLabel]);
  return children;
}

export default function PortalShell({ Frame }) {
  const { pathname } = useLocation();
  const outlet = useOutletContext();
  const [page, setPage] = useState(null);
  const context = useMemo(() => ({ setPage }), []);
  const current = page?.pathname === pathname ? page : null;
  const crumbs = breadcrumbsFor(pathname, current?.breadcrumbLabel);
  return <Frame title={current?.title || crumbs.at(-1)?.label || "Dashboard"}>
    <ShellContext.Provider value={context}>
      <PageTransition>
        <PortalBreadcrumb entityLabel={current?.breadcrumbLabel} />
        <Outlet context={outlet} />
      </PageTransition>
    </ShellContext.Provider>
  </Frame>;
}
