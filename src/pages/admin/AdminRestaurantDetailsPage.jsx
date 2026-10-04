import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Clock3, FileText, Mail, MapPin, Phone, Store, User, Users, ShieldAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState as useModalState } from "react";
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
  const [action, setAction] = useModalState("");
  const [reason, setReason] = useModalState("");
  const [busy, setBusy] = useModalState(false);
  const [actionError, setActionError] = useModalState("");
  const [restaurant, setRestaurant] = useState(null);
  const [floorData, setFloorData] = useState([]);
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

  useEffect(() => {
    requestJson(`/api/admin/restaurants/${restaurantId}/floors`).then(setFloorData).catch(() => setFloorData([]));
  }, [restaurantId]);

  async function confirmStatusChange() {
    setBusy(true); setActionError("");
    try {
      const suspending = action === "suspend";
      const updated = await requestJson(`/api/admin/restaurants/${restaurantId}/${action}`, {
        method: "POST", ...(suspending ? { body: JSON.stringify({ reason }) } : {}),
      });
      setRestaurant((current) => ({ ...current, status: updated.status }));
      setAction(""); setReason("");
      if (updated.email_sent === false) setActionError("Restaurant suspended, but the manager notification email could not be sent.");
    } catch (err) { setActionError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <AdminLayout title="Restaurant Details" activePath="/admin/restaurants">
      <div className={`admin-dashboard-content ${restaurant && !loading && !error ? "admin-restaurant-detail-layout" : ""}`}>
        <Link className="admin-restaurant-back" to="/admin/restaurants"><ArrowLeft size={16} /> Back to restaurants</Link>
        {loading ? <div className="admin-request-empty">Loading restaurant details…</div> : error ? <div className="admin-request-error" role="alert">{error}</div> : restaurant ? (
          <>
            <div className="admin-restaurant-detail-heading">
              <div><span>RESTAURANT PROFILE</span><h2>{restaurant.name}</h2><p>{[restaurant.cuisine_type, restaurant.city, restaurant.state].filter(Boolean).join(" · ")}</p></div>
              <div className="admin-restaurant-status-actions"><span className={`restaurant-status ${restaurant.status?.toLowerCase()}`}>{restaurant.status}</span>{restaurant.status === "SUSPENDED" ? <button className="admin-confirm-submit approve" onClick={() => setAction("resume")}>Resume restaurant</button> : restaurant.status === "APPROVED" ? <button className="admin-confirm-submit reject" onClick={() => setAction("suspend")}><ShieldAlert size={15} /> Suspend restaurant</button> : null}</div>
            </div>
            {actionError && <div className="admin-request-error" role="alert">{actionError}</div>}

            <section className="admin-restaurant-detail-card"><h3><Building2 size={17} /> Floor and table oversight</h3>{floorData.length ? floorData.map(floor => <div key={floor.id}><strong>{floor.name}</strong><p>{floor.tables.length ? floor.tables.map(table => `Table ${table.table_number} · ${table.seats} seats · ${table.status}`).join(" | ") : "No tables assigned"}</p></div>) : <p>No floors or tables configured.</p>}</section>

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
      {action && <div className="admin-confirm-backdrop" role="presentation"><section className="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="restaurant-action-title"><button type="button" className="admin-confirm-close" onClick={() => setAction("")} disabled={busy} aria-label="Close">×</button><div className={`admin-confirm-icon ${action === "suspend" ? "reject" : "approve"}`}><ShieldAlert size={21} /></div><h2 id="restaurant-action-title">{action === "suspend" ? "Suspend this restaurant?" : "Resume this restaurant?"}</h2><p>{action === "suspend" ? `${restaurant?.name} will disappear from customer pages. The owner and chefs will lose portal access, and the owner will be emailed.` : `${restaurant?.name} will return to customer pages and portal access will be restored.`}</p>{action === "suspend" && <label className="restaurant-suspension-reason">Reason for suspension<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Explain why this restaurant is being suspended" /></label>}<div className="admin-confirm-actions"><button className="admin-confirm-cancel" onClick={() => setAction("")} disabled={busy}>Cancel</button><button className={`admin-confirm-submit ${action === "suspend" ? "reject" : "approve"}`} onClick={confirmStatusChange} disabled={busy}>{busy ? "Processing…" : action === "suspend" ? "Suspend restaurant" : "Resume restaurant"}</button></div></section></div>}
    </AdminLayout>
  );
}
