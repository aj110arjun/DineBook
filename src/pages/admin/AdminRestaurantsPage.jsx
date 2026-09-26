import { Search, MoreVertical } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";

const restaurants = [
  {
    name: "The Garden Table",
    location: "Kochi, Kerala",
    owner: "Rahul Menon",
    status: "Active",
    reservations: 128,
  },
  {
    name: "Spice Route",
    location: "Thiruvananthapuram, Kerala",
    owner: "Anjali Nair",
    status: "Pending",
    reservations: 86,
  },
  {
    name: "Coastal Kitchen",
    location: "Kozhikode, Kerala",
    owner: "Arun Kumar",
    status: "Active",
    reservations: 104,
  },
];

export default function AdminRestaurantsPage() {
  return (
    <AdminLayout title="Restaurants" activePath="/admin/restaurants">
      <div className="admin-dashboard-content">
        <div className="admin-page-heading">
          <div>
            <h2>Restaurant Management</h2>
            <p>Manage restaurants registered on the DineBook platform.</p>
          </div>

          <div className="admin-page-actions">
            <div className="admin-search">
              <Search size={15} />
              <input type="search" placeholder="Search restaurants..." />
            </div>
          </div>
        </div>

        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Reservations</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.name}>
                  <td>
                    <strong>{restaurant.name}</strong>
                  </td>

                  <td>{restaurant.location}</td>

                  <td>{restaurant.owner}</td>

                  <td>
                    <span
                      className={`restaurant-status ${restaurant.status.toLowerCase()}`}
                    >
                      {restaurant.status}
                    </span>
                  </td>

                  <td>{restaurant.reservations}</td>

                  <td>
                    <button
                      type="button"
                      className="admin-table-action"
                      aria-label={`Actions for ${restaurant.name}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
