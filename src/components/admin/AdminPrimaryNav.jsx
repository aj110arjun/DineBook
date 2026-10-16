import {
  Bell,
  FileText,
  LayoutDashboard,
  SlidersHorizontal,
  Store,
  Tag,
  WalletCards,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const groups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    ],
  },
  {
    label: "Manage DineBook",
    items: [
      { label: "Restaurants", icon: Store, path: "/admin/restaurants" },
      { label: "Restaurant requests", icon: SlidersHorizontal, path: "/admin/requests" },
      { label: "Offers", icon: Tag, path: "/admin/offers" },
      { label: "Reviews & reports", icon: FileText, path: "/admin/reviews" },
      { label: "Notifications", icon: Bell, path: "/admin/notifications" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Revenue & wallet", icon: WalletCards, path: "/admin/revenue" },
    ],
  },
];

export default function AdminPrimaryNav({ onNavigate }) {
  const { pathname } = useLocation();

  return (
    <nav className="admin-nav" aria-label="Administrator navigation">
      {groups.map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <h2 className="admin-nav-group-title">{group.label}</h2>
          {group.items.map(({ label, icon: Icon, path }) => {
            const active = pathname === path || pathname.startsWith(`${path}/`);
            return (
              <Link
                key={path}
                to={path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
