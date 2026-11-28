export const queryKeys = {
  restaurants: {
    all: ["restaurants"],
    list: (filters = {}) => ["restaurants", "list", filters],
    detail: (id) => ["restaurants", "detail", id],
    menu: (id, filters = {}) => ["restaurants", "detail", id, "menu", filters],
  },
  reservations: {
    all: ["reservations"],
    list: (filters = {}) => ["reservations", "list", filters],
    detail: (id) => ["reservations", "detail", id],
  },
  orders: { all: ["orders"], list: (filters = {}) => ["orders", "list", filters], detail: (id) => ["orders", "detail", id] },
  customer: { profile: ["customer", "profile"] },
  reviews: { all: ["reviews"], restaurant: (id, filters = {}) => ["reviews", "restaurant", id, filters] },
  notifications: { all: ["notifications"], list: (filters = {}) => ["notifications", "list", filters], unread: ["notifications", "unread"] },
  dashboards: {
    admin: (resource, filters = {}) => ["dashboard", "admin", resource, filters],
    manager: (filters = {}) => ["dashboard", "manager", filters],
    chef: (filters = {}) => ["dashboard", "chef", filters],
  },
};
