import { Link, useLocation } from "react-router-dom";
import { breadcrumbsFor } from "../lib/routeMetadata.js";

export default function PortalBreadcrumb({
  home,
  items,
  className = "portal-breadcrumb",
  entityLabel,
}) {
  const { pathname } = useLocation();
  const derived = breadcrumbsFor(pathname, entityLabel);
  const portal = pathname.split("/")[1];
  const entries = (home ? [home, ...(items || [])] : derived).map((entry) => ({
    ...entry, to: entry.to === `/${portal}` || entry.to?.startsWith(`/${portal}/`) ? entry.to : undefined,
  }));
  if (entries.length < 2) return null;
  return (
    <nav className={className} aria-label="Breadcrumb">
      {entries.map((item, index) => (
        <span className="portal-breadcrumb-item" key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.to && index < entries.length - 1 ? (
            <Link to={item.to} title={item.label}>{item.label}</Link>
          ) : index === entries.length - 1 ? (
            <strong aria-current="page" title={item.label}>{item.label}</strong>
          ) : <span title={item.label}>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
