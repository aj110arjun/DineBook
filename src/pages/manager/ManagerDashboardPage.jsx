import { useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, Plus, ShoppingBasket, Star, Table2, Tag } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { requestJson } from "../../lib/authApi.js";

const revenueData = [
  { day: "Mon", value: 32 },
  { day: "Tue", value: 48 },
  { day: "Wed", value: 36 },
  { day: "Thu", value: 72 },
  { day: "Fri", value: 55 },
  { day: "Sat", value: 82 },
  { day: "Sun", value: 65 },
];

const tables = [
  { name: "Table T1", seats: "2 Seats", status: "Available" },
  { name: "Table T2", seats: "4 Seats", status: "Occupied" },
  { name: "Table T3", seats: "4 Seats", status: "Reserved" },
  { name: "Table T4", seats: "4 Seats", status: "Available" },
  { name: "Table T5", seats: "6 Seats", status: "Occupied" },
  { name: "Table T6", seats: "8 Seats", status: "Available" },
  { name: "Table T7", seats: "2 Seats", status: "Available" },
  { name: "Table T8", seats: "4 Seats", status: "Maintenance" },
];

const reservations = [
  { name: "Arjun Sharma", details: "4 Guests • Table 3", time: "12:30 PM" },
  { name: "Preeti Patel", details: "2 Guests • Table 1", time: "01:00 PM" },
  { name: "David Miller", details: "6 Guests • Table 5", time: "01:30 PM" },
  { name: "Siddharth Sen", details: "8 Guests • Table 6", time: "08:00 PM" },
];

const activeOrders = [
  {
    id: "#DB-9842",
    details: "1x Margherita Pizza, 1x Pasta",
    amount: "₹970",
    status: "Preparing",
  },
  {
    id: "#DB-9841",
    details: "2x Chicken Biryani, 1x Raita",
    amount: "₹1,250",
    status: "Ready",
  },
  {
    id: "#DB-9840",
    details: "1x Tiramisu, 1x Espresso",
    amount: "₹510",
    status: "Completed",
  },
];

const popularItems = [
  { name: "Wood-Fired Margherita Pizza", orders: "18 Orders", price: "₹450" },
  { name: "Homemade Tiramisu", orders: "12 Orders", price: "₹320" },
  { name: "Pasta Carbonara Creamy", orders: "9 Orders", price: "₹520" },
];

export default function ManagerDashboardPage() {
  const [managerName, setManagerName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  useEffect(() => {
    let active = true;
    requestJson("/api/auth/manager/me")
      .then((manager) => {
        if (active) {
          setManagerName(manager.name?.trim() || "");
          setRestaurantName(manager.restaurant_name?.trim() || "");
        }
      })
      .catch(() => { if (active) { setManagerName(""); setRestaurantName(""); } });
    return () => { active = false; };
  }, []);

  return (
    <ManagerLayout title="Dashboard">
      <div className="manager-dashboard-content">
          <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Dashboard" }]} className="manager-breadcrumb" />

          <div className="manager-heading">
            <div>
              <h2>Good Morning{managerName ? `, ${managerName}` : ""}</h2>
              <p>{restaurantName ? `Here's what's happening at ${restaurantName} today.` : "Here's what's happening at your restaurant today."}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="manager-quick-actions">
            <button>
              <span className="manager-action-icon">
                <Plus size={17} />
              </span>
              <span>
                <strong>Add Food Item</strong>
                <small>Instantly list new culinary arrivals</small>
              </span>
            </button>

            <button>
              <span className="manager-action-icon">
                <Tag size={17} />
              </span>
              <span>
                <strong>Add Offer</strong>
                <small>Create discount campaigns & promotions</small>
              </span>
            </button>

            <button>
              <span className="manager-action-icon">
                <Table2 size={17} />
              </span>
              <span>
                <strong>Manage Tables</strong>
                <small>Configure floor plans & online booking</small>
              </span>
            </button>

            <button>
              <span className="manager-action-icon">
                <CalendarDays size={17} />
              </span>
              <span>
                <strong>View Reservations</strong>
                <small>Check upcoming party bookings</small>
              </span>
            </button>
          </div>

          {/* Summary cards */}
          <div className="manager-summary-grid">
            <SummaryCard
              title="Today's Revenue"
              value="₹42,580"
              change="+12.4%"
              detail="12% more than last Monday"
              icon={CircleDollarSign}
            />

            <SummaryCard
              title="Today's Orders"
              value="38"
              change="+8%"
              detail="5 currently being prepared"
              icon={ShoppingBasket}
            />

            <SummaryCard
              title="Reservations"
              value="12"
              change="On Track"
              detail="75 guests total confirmed"
              icon={CalendarDays}
            />

            <SummaryCard
              title="Table Occupancy"
              value="6 / 14"
              change="42% full"
              detail="8 tables currently free"
              icon={Table2}
            />

            <SummaryCard
              title="Average Rating"
              value="4.7 ★"
              change="+0.1"
              detail="Based on 482 public reviews"
              icon={Star}
            />
          </div>

          {/* Revenue + order status */}
          <div className="manager-dashboard-grid">
            <section className="manager-panel manager-revenue-panel">
              <div className="manager-panel-header">
                <h3>Weekly Revenue Overview</h3>
                <span>Mon 18 Sep - Sun 24 Sep</span>
              </div>

              <div className="manager-revenue-chart">
                {revenueData.map((item) => (
                  <div className="manager-chart-column" key={item.day}>
                    <div className="manager-chart-bar-wrap">
                      <div
                        className="manager-chart-bar"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>
                    <span>{item.day}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="manager-panel manager-orders-panel">
              <div className="manager-panel-header">
                <h3>Live Order Statuses</h3>
              </div>

              <div className="manager-order-status">
                <div className="manager-order-donut">
                  <strong>38</strong>
                </div>

                <div className="manager-order-legend">
                  <div>
                    <span className="status-dot completed" />
                    Completed (22)
                  </div>

                  <div>
                    <span className="status-dot ready" />
                    Ready to Serve (4)
                  </div>

                  <div>
                    <span className="status-dot preparing" />
                    Preparing (8)
                  </div>

                  <div>
                    <span className="status-dot pending" />
                    Pending (4)
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Tables + Popular */}
          <div className="manager-dashboard-grid manager-middle-grid">
            <section className="manager-panel">
              <div className="manager-panel-header">
                <h3>Live Floor Status Summary</h3>
              </div>

              <div className="manager-table-grid">
                {tables.map((table) => (
                  <div
                    className={`manager-table-card ${table.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                    key={table.name}
                  >
                    <strong>{table.name}</strong>
                    <span>{table.seats}</span>
                    <small>{table.status}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="manager-panel manager-popular-panel">
              <div className="manager-panel-header">
                <h3>Popular Today</h3>
              </div>

              <div className="manager-popular-list">
                {popularItems.map((item) => (
                  <div key={item.name} className="manager-popular-item">
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.orders}</span>
                    </div>

                    <b>{item.price}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Reservations + orders */}
          <div className="manager-bottom-grid">
            <section className="manager-panel">
              <div className="manager-panel-header">
                <h3>Upcoming Reservations</h3>
                <button>View All</button>
              </div>

              <div className="manager-list">
                {reservations.map((reservation) => (
                  <div className="manager-list-row" key={reservation.name}>
                    <div>
                      <strong>{reservation.name}</strong>
                      <span>{reservation.details}</span>
                    </div>

                    <b>{reservation.time}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className="manager-panel">
              <div className="manager-panel-header">
                <h3>Recent Active Orders</h3>
                <button>View All</button>
              </div>

              <div className="manager-list">
                {activeOrders.map((order) => (
                  <div className="manager-list-row" key={order.id}>
                    <div>
                      <strong>{order.id}</strong>
                      <span>{order.details}</span>
                    </div>

                    <div className="manager-order-row-right">
                      <b>{order.amount}</b>
                      <span
                        className={`manager-order-pill ${order.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
      </div>
    </ManagerLayout>
  );
}

function SummaryCard({ title, value, change, detail, icon: Icon }) {
  return (
    <article className="manager-summary-card">
      <div className="manager-summary-top">
        <span>{title}</span>

        <div className="manager-summary-icon">
          <Icon size={16} />
        </div>
      </div>

      <strong className="manager-summary-value">{value}</strong>

      <div className="manager-summary-detail">
        <b>{change}</b>
        <span>{detail}</span>
      </div>
    </article>
  );
}
