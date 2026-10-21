import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Clock3, FileText, Mail, MapPin, Phone, Store, User, Users, ShieldAlert, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState as useModalState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import { requestJson } from "../../lib/authApi.js";
import Pagination from "../../components/Pagination.jsx";
import AdminRestaurantPaymentsPanel from "./AdminRestaurantPaymentsPanel.jsx";

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="admin-restaurant-detail-item">
      {Icon && <Icon size={15} />}
      <div><span>{label}</span><strong>{value || "Not provided"}</strong></div>
    </div>
  );
}

function compareLabels(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatTableStatus(status) {
  return String(status || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminRestaurantDetailsPage() {
  const { restaurantId } = useParams();
  const [action, setAction] = useModalState("");
  const [reason, setReason] = useModalState("");
  const [busy, setBusy] = useModalState(false);
  const [actionError, setActionError] = useModalState("");
  const [restaurant, setRestaurant] = useState(null);
  const [floorData, setFloorData] = useState([]);
  const [operatingSchedule, setOperatingSchedule] = useState(null);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspectionTime, setInspectionTime] = useState("19:00");
  const [inspectionGuests, setInspectionGuests] = useState("2");
  const [inspection, setInspection] = useState(null);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionBusy, setInspectionBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [tableStatus, setTableStatus] = useState("ALL");
  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState("ALL");
  const [menuAvailability, setMenuAvailability] = useState("ALL");
  const [menuSort, setMenuSort] = useState("name");
  const [menuPage, setMenuPage] = useState(1);
  const menuPageSize = 10;

  const orderedFloors = [...floorData].sort((left, right) =>
    Number(left.floor_number ?? Number.MAX_SAFE_INTEGER) - Number(right.floor_number ?? Number.MAX_SAFE_INTEGER)
      || compareLabels(left.name, right.name)
  );
  const menuFoods = useMemo(() => (restaurant?.menu || []).flatMap((category) => category.foods.map((food) => ({ ...food, category_id: category.id, category_name: category.name })))
    .filter((food) => (menuCategory === "ALL" || food.category_id === menuCategory)
      && (!menuQuery.trim() || `${food.name || ""} ${food.description || ""} ${food.category_name || ""}`.toLowerCase().includes(menuQuery.trim().toLowerCase()))
      && (menuAvailability === "ALL" || (menuAvailability === "AVAILABLE" ? food.is_available : !food.is_available)))
    .sort((left, right) => menuSort === "name-desc" ? right.name.localeCompare(left.name) : left.name.localeCompare(right.name)), [restaurant?.menu, menuCategory, menuQuery, menuAvailability, menuSort]);
  const menuPageCount = Math.max(1, Math.ceil(menuFoods.length / menuPageSize));
  const visibleMenuFoods = menuFoods.slice((menuPage - 1) * menuPageSize, menuPage * menuPageSize);
  useEffect(() => { setMenuPage(1); }, [menuCategory, menuQuery, menuAvailability, menuSort]);
  useEffect(() => { setMenuPage((current) => Math.min(current, menuPageCount)); }, [menuPageCount]);

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

  useEffect(() => {
    requestJson(`/api/admin/restaurants/${restaurantId}/operating-hours?day=${inspectionDate}`)
      .then(setOperatingSchedule).catch(() => setOperatingSchedule(null));
  }, [restaurantId, inspectionDate]);

  async function inspectAvailability(event) {
    event.preventDefault(); setInspectionBusy(true); setInspectionError("");
    try {
      const query = new URLSearchParams({ reservation_date: inspectionDate, start_time: inspectionTime, number_of_guests: inspectionGuests });
      setInspection(await requestJson(`/api/admin/restaurants/${restaurantId}/availability-inspection?${query}`));
    } catch (reason) { setInspection(null); setInspectionError(reason.message); }
    finally { setInspectionBusy(false); }
  }

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

            <section className="admin-restaurant-detail-card">
              <h3><Store size={17} /> Restaurant information</h3>
              <div className="admin-restaurant-detail-grid">
                <Detail label="Cuisine" value={restaurant.cuisine_type} icon={Store} />
                <Detail label="Restaurant email" value={restaurant.email} icon={Mail} />
                <Detail label="Phone" value={restaurant.phone} icon={Phone} />
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
              {operatingSchedule?.days?.length ? <div className="admin-restaurant-hours">{operatingSchedule.days.map((day) => <div key={day.day}><span>{day.day}</span><strong>{day.periods.length ? day.periods.map((period) => `${period.opens} – ${period.closes}`).join(" · ") : "Closed"}{day.updated_at && <small className="operating-audit">Updated {new Date(day.updated_at).toLocaleString()}{day.updated_by ? ` · user ${day.updated_by}` : ""}</small>}</strong></div>)}</div> : <p className="admin-restaurant-empty">{restaurant.hours?.length ? "Loading current schedule…" : "No operating hours have been provided."}</p>}
              <small>Schedule time zone: {operatingSchedule?.timezone || "Asia/Kolkata"}</small>
              <h4>Schedule exceptions and history</h4>{operatingSchedule?.exceptions?.length ? <ul className="operating-exception-list">{operatingSchedule.exceptions.map((item) => <li key={item.id}><div><strong>{item.start_date}{item.end_date !== item.start_date ? ` – ${item.end_date}` : ""}</strong><span>{item.is_closed ? "Closed" : item.periods.map((period) => `${period.opens}–${period.closes}`).join(" · ")}</span>{item.reason && <small>{item.reason}</small>}{item.updated_at && <small>Updated {new Date(item.updated_at).toLocaleString()}{item.created_by ? ` · user ${item.created_by}` : ""}</small>}</div></li>)}</ul> : <p>No exceptions have been recorded.</p>}
              <h4>Availability inspection</h4><form className="operating-inspection-form" onSubmit={inspectAvailability}><label>Date<input type="date" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} /></label><label>Start time<input type="time" value={inspectionTime} onChange={(event) => setInspectionTime(event.target.value)} /></label><label>Guests<input type="number" min="1" max="16" value={inspectionGuests} onChange={(event) => setInspectionGuests(event.target.value)} /></label><button type="submit" disabled={inspectionBusy}>{inspectionBusy ? "Checking…" : "Inspect slot"}</button></form>
              {inspectionError && <p role="alert">{inspectionError}</p>}{inspection && <div className="operating-inspection-result"><strong>{inspection.available ? "Available" : "Unavailable"}</strong><span>{inspection.reason || `${inspection.tables.length} suitable table option(s)`}</span>{inspection.exception_reason && <small>Schedule exception: {inspection.exception_reason}</small>}</div>}
            </section>

            <AdminRestaurantPaymentsPanel restaurantId={restaurant.id} />

            <section className="admin-restaurant-detail-card admin-restaurant-wide-card">
              <h3><FileText size={17} /> Submitted documents</h3>
              {restaurant.documents?.length ? <div className="admin-restaurant-documents">{restaurant.documents.map((document) => <a key={document.id} href={document.file_path} target="_blank" rel="noreferrer"><FileText size={17} /><span><strong>{document.document_type.replaceAll("_", " ")}</strong><small>{document.file_name}</small></span></a>)}</div> : <p className="admin-restaurant-empty">No documents have been uploaded.</p>}
            </section>

            <section className="admin-restaurant-detail-card admin-restaurant-wide-card"><h3><Building2 size={17} /> Floor and table oversight</h3>{orderedFloors.length ? <><div className="admin-page-actions"><div className="admin-search"><Search size={15} /><input type="search" value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Search table or floor" aria-label="Search floor tables" /></div><select className="admin-filter-select" aria-label="Filter tables by status" value={tableStatus} onChange={(event) => setTableStatus(event.target.value)}><option value="ALL">All table statuses</option>{[...new Set(orderedFloors.flatMap((floor) => floor.tables.map((table) => table.status)).filter(Boolean))].sort().map((status) => <option key={status} value={status}>{formatTableStatus(status)}</option>)}</select></div><div className="admin-floor-list">{orderedFloors.map(floor => { const tables = [...floor.tables].filter((table) => (tableStatus === "ALL" || table.status === tableStatus) && (!tableQuery.trim() || `${table.table_number} ${table.id} ${floor.name}`.toLowerCase().includes(tableQuery.trim().toLowerCase()))).sort((left, right) => compareLabels(left.table_number, right.table_number)); return <article className="admin-floor-item" key={floor.id}><div className="admin-floor-heading"><strong>{floor.name}</strong><span>{tables.length} {tables.length === 1 ? "table" : "tables"}</span></div>{tables.length ? <div className="admin-floor-table-list">{tables.map(table => <div className="admin-floor-table" key={table.id}><strong>Table {table.table_number}</strong><span>{table.seats} seats</span><span className={`admin-floor-table-status ${table.status?.toLowerCase()}`}>{formatTableStatus(table.status)}</span></div>)}</div> : <p className="admin-floor-empty">No tables match these filters.</p>}</article>; })}</div></> : <p className="admin-restaurant-empty">No floors or tables configured.</p>}</section>

            <section className="admin-restaurant-detail-card admin-restaurant-wide-card"><h3><Store size={17} /> Menu inspection</h3>{restaurant.menu?.length ? <><div className="admin-page-actions"><div className="admin-search"><Search size={15} /><input type="search" value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder="Search dish or description" aria-label="Search inspected menu" /></div><select className="admin-filter-select" aria-label="Filter menu category" value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)}><option value="ALL">All categories</option>{restaurant.menu.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select className="admin-filter-select" aria-label="Filter dish availability" value={menuAvailability} onChange={(event) => setMenuAvailability(event.target.value)}><option value="ALL">All availability</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option></select><select className="admin-filter-select" aria-label="Sort menu dishes" value={menuSort} onChange={(event) => setMenuSort(event.target.value)}><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option></select></div>{visibleMenuFoods.length ? <div className="admin-menu-inspection-grid">{visibleMenuFoods.map((food) => <article key={food.id}>{food.image_url && <img src={food.image_url} alt={food.name} loading="lazy" />}<small>{food.category_name}</small><h4>{food.name}{!food.is_available && " · Unavailable"}</h4>{food.description && <p>{food.description}</p>}{food.variants?.length ? <ul>{food.variants.map((variant) => <li key={variant.id}>{variant.name} · ₹{Number(variant.price).toFixed(2)}{!variant.is_available && " · Unavailable"}</li>)}</ul> : <small>No variants</small>}</article>)}</div> : <p className="admin-restaurant-empty">No menu items match these filters.</p>}{menuFoods.length > 0 && <Pagination page={menuPage} pageSize={menuPageSize} total={menuFoods.length} onPageChange={setMenuPage} label="menu items" />}</> : <p className="admin-restaurant-empty">No menu categories have been added.</p>}</section>
          </>
        ) : null}
      </div>
      {action && <ConfirmActionDialog action={action} resourceType="restaurant" resourceName={restaurant?.name} title={action === "suspend" ? "Suspend this restaurant?" : "Resume this restaurant?"} description={action === "suspend" ? `${restaurant?.name} will disappear from customer pages. The owner and chefs will lose portal access, and the owner will be notified by email.` : `${restaurant?.name} will return to customer pages and manager portal access will be restored.`} confirmLabel={action === "suspend" ? "Suspend restaurant" : "Resume restaurant"} busy={busy} requireReason={action === "suspend"} reasonLabel="Reason for suspension" reason={reason} onReasonChange={setReason} onCancel={() => { if (!busy) { setAction(""); setReason(""); } }} onConfirm={confirmStatusChange} />}
    </AdminLayout>
  );
}
