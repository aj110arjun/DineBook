import { Link } from "react-router-dom";

export default function PortalBreadcrumb({ home, items, className = "portal-breadcrumb" }) {
  return (
    <nav className={className} aria-label="Breadcrumb">
      <Link to={home.to}>{home.label}</Link>
      {items.map((item, index) => (
        <span className="portal-breadcrumb-item" key={`${item.label}-${index}`}>
          <span aria-hidden="true">/</span>
          {item.to && index < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}
        </span>
      ))}
    </nav>
  );
}
