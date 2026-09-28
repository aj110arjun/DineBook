import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Clock3, FileText, Mail, MapPin, Phone, Store, User, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="admin-restaurant-detail-item">
      {Icon && <Icon size={15} />}
      <div><span>{label}</span><strong>{value || "Not provided"}</strong></div>
    </div>
  );
}

export default function AdminRestaurantDetailsPage() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    requestJson(`/api/admin/restaurants/${restaurantId}`)
      .then((data) => mounted && setRestaurant(data))
      .catch((reason) => mounted && setError(reason.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [restaurantId]);

  return (
    <AdminLayout title="Restaurant Details" activePath="/admin/restaurants">
      <div className="admin-dashboard-content">
        <Link className="admin-restaurant-back" to="/admin/restaurants"><ArrowLeft size={16} /> Back to restaurants</Link>
        {loading ? <div className="admin-request-empty">Loading restaurant details…</div> : error ? <div className="admin-request-error" role="alert">{error}</div> : restaurant ? (
          <>
            <div className="admin-restaurant-detail-heading">
              <div><span>RESTAURANT PROFILE</span><h2>{restaurant.name}</h2><p>{[restaurant.cuisine_type, restaurant.city, restaurant.state].filter(Boolean).join(" · ")}</p></div>
              <span className={`restaurant-status ${restaurant.status?.toLowerCase()}`}>{restaurant.status}</span>
            </div>

            <section className="admin-restaurant-detail-card">
              <h3><Store size={17} /> Restaurant information</h3>
              <div className="admin-restaurant-detail-grid">
                <Detail label="Cuisine" value={restaurant.cuisine_type} icon={Store} />
                <Detail label="Restaurant email" value={restaurant.email} icon={Mail} />
                <Detail label="Phone" value={restaurant.phone} icon={Phone} />
                <Detail label="Seating capacity" value={restaurant.capacity} icon={Users} />
                <Detail label="Dining tables" value={restaurant.tables} icon={Building2} />
                <Detail label="Registered" value={restaurant.created_at ? new Date(restaurant.created_at).toLocaleString() : null} icon={CalendarDays} />
              </div>
              <div className="admin-restaurant-description"><span>Description</span><p>{restaurant.description || "No description provided."}</p></div>
            </section>

            <section className="admin-restaurant-detail-card">
              <h3><User size={17} /> Manager information</h3>
              <div className="admin-restaurant-detail-grid">
                <Detail label="Manager name" value={restaurant.manager?.name} icon={User} />
                <Detail label="Manager email" value={restaurant.manager?.email} icon={Mail} />
                <Detail label="Manager account status" value={restaurant.manager?.status} icon={User} />
              </div>
            </section>

            <section className="admin-restaurant-detail-card">
              <h3><MapPin size={17} /> Address</h3>
              <div className="admin-restaurant-detail-grid">
                <Detail label="Street address" value={restaurant.address} icon={MapPin} />
                <Detail label="City" value={restaurant.city} icon={MapPin} />
                <Detail label="State" value={restaurant.state} icon={MapPin} />
                <Detail label="PIN code" value={restaurant.pin_code} icon={MapPin} />
                <Detail label="Latitude" value={restaurant.latitude} icon={MapPin} />
                <Detail label="Longitude" value={restaurant.longitude} icon={MapPin} />
              </div>
            </section>

            <section className="admin-restaurant-detail-card">
              <h3><Clock3 size={17} /> Operating hours</h3>
              {restaurant.hours?.length ? <div className="admin-restaurant-hours">{restaurant.hours.map((hour) => <div key={hour.day}><span>{hour.day}</span><strong>{hour.enabled ? `${hour.opens || "—"} – ${hour.closes || "—"}` : "Closed"}</strong></div>)}</div> : <p className="admin-restaurant-empty">No operating hours have been provided.</p>}
            </section>

            <section className="admin-restaurant-detail-card">
              <h3><FileText size={17} /> Submitted documents</h3>
              {restaurant.documents?.length ? <div className="admin-restaurant-documents">{restaurant.documents.map((document) => <a key={document.id} href={document.file_path} target="_blank" rel="noreferrer"><FileText size={17} /><span><strong>{document.document_type.replaceAll("_", " ")}</strong><small>{document.file_name}</small></span></a>)}</div> : <p className="admin-restaurant-empty">No documents have been uploaded.</p>}
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
