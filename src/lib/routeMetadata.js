import { matchPath } from "react-router-dom";

const item = (label, to, key) => ({
  label,
  ...(to ? { to } : {}),
  ...(key ? { key } : {}),
});
const customerAccount = item("My account", "/customer/profile");
const restaurants = item("Restaurants", "/customer/restaurants");
// Only actual application routes belong here. Dynamic identifiers never become labels.
export const routeMetadata = [
  [
    "/customer/restaurants/:restaurantId/booking",
    [
      restaurants,
      item("Restaurant details", "/customer/restaurants/:restaurantId", "restaurant"),
      item("Book a table"),
    ],
  ],
  [
    "/customer/restaurants/:restaurantId/:section?",
    [restaurants, item("Restaurant details", undefined, "restaurant")],
  ],
  ["/customer/restaurants", [restaurants]],
  ["/customer/profile/reservations/:reservationId", [item("My reservations", "/customer/profile/reservations"), item("Reservation details")]],
  ["/customer/profile/reservations", [item("My reservations")]],
  ["/customer/profile/transactions/:transactionType/:transactionId", [customerAccount, item("Transactions", "/customer/profile/transactions"), item("Transaction details")]],
  ["/customer/profile/transactions", [customerAccount, item("Transactions")]],
  ["/customer/profile/orders", [item("My orders")]],
  ["/customer/profile/wallet", [customerAccount, item("Wallet")]],
  ["/customer/profile", [item("My account")]],
  ["/customer/saved-restaurants", [item("Saved restaurants")]],
  ["/customer/settings", [customerAccount, item("Settings")]],
  ["/manager/orders/:orderId", [item("Reservations & orders", "/manager/reservations"), item("Order details")]],
  ["/manager/payments/:transactionId", [item("Payments", "/manager/payments"), item("Transaction details")]],
  ["/manager/menu/:foodId", [item("Menu", "/manager/menu"), item("Dish details")]],
  ["/manager/dashboard", []],
  ...Object.entries({ reservations: "Reservations", "spot-order": "New walk-in order", menu: "Menu", staff: "Kitchen team", tables: "Tables & floors", "operating-hours": "Opening hours", offers: "Offers", reviews: "Reviews", payments: "Payments", revenue: "Revenue & wallet", profile: "Manager profile", settings: "Settings", "restaurant-location": "Restaurant location" }).map(([path, label]) => [`/manager/${path}`, [item(label)]]),
  ["/chef/menu/:foodId", [item("Menu", "/chef/menu"), item("Dish details")]],
  ["/chef/dashboard", []],
  ...Object.entries({ orders: "Kitchen orders", menu: "Menu", "service-hours": "Service hours", revenue: "Revenue & wallet", profile: "Chef profile", settings: "Settings" }).map(([path, label]) => [`/chef/${path}`, [item(label)]]),
  ["/admin/restaurants/:restaurantId", [item("Restaurants", "/admin/restaurants"), item("Restaurant details")]],
  ["/admin/requests/:requestId", [item("Requests", "/admin/requests"), item("Manager request")]],
  ["/admin/transactions/:restaurantId/:transactionId", [item("Transactions", "/admin/transactions"), item("Transaction details")]],
  ["/admin/dashboard", []],
  ...Object.entries({ restaurants: "Restaurants", requests: "Requests", offers: "Offers", transactions: "Transactions", revenue: "Revenue & commission", reviews: "Review moderation", profile: "Admin profile", settings: "Settings" }).map(([path, label]) => [`/admin/${path}`, [item(label)]]),
];

export function breadcrumbsFor(pathname, entityLabel, entityLabels = {}) {
  const route = routeMetadata.find(([path]) => matchPath({ path, end: true }, pathname));
  if (!route) return [];
  const portal = pathname.split("/")[1];
  const match = matchPath({ path: route[0], end: true }, pathname);
  const home = item(portal === "customer" ? "Home" : "Dashboard", portal === "customer" ? "/customer" : `/${portal}/dashboard`);
  const crumbs = [home, ...route[1].map((entry) => ({
    ...entry,
    label: entry.key && typeof entityLabels?.[entry.key] === "string" && entityLabels[entry.key].trim()
      ? entityLabels[entry.key].trim()
      : entry.label,
    to: entry.to?.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(match.params[key])),
  }))];
  if (typeof entityLabel === "string" && entityLabel.trim() && route[0].includes(":")) {
    crumbs[crumbs.length - 1].label = entityLabel.trim();
  }
  return crumbs.map((entry, index) => index === crumbs.length - 1 ? { label: entry.label } : entry);
}
