import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, Pencil, ShieldCheck, Store } from "lucide-react";
import { Link } from "react-router-dom";
import ConfirmActionDialog from "../../ConfirmActionDialog.jsx";
import ImageUploadField from "../ImageUploadField.jsx";
import Notice from "../../auth/Notice.jsx";
import { requestJson } from "../../../lib/authApi.js";
import { formatLocalDateTime, formatWallTime } from "../../../lib/localDate.js";
import { validateAvatar } from "../../../lib/customerProfile.js";
import { profileStatus, RESTAURANT_FIELDS, restaurantForm, restaurantPatch, saveRestaurantProfile, validateRestaurant } from "../../../lib/managerProfile.js";
import { Detail, ProfileField, useImagePreview } from "./ProfileParts.jsx";

const documentLabels = {
  FSSAI_LICENSE: "FSSAI license", BUSINESS_REGISTRATION: "Business registration", GST_CERTIFICATE: "GST certificate", OWNER_IDENTITY: "Owner identity",
};

export default function RestaurantInformation({ restaurant, onPersist, onAuthError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => restaurantForm(restaurant));
  const [file, setFile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [failedImage, setFailedImage] = useState(null);
  const preview = useImagePreview(file);
  const busyRef = useRef(false);
  const cover = file ? preview : restaurant.branding_image_url;
  const changed = Object.keys(restaurantPatch(restaurant, form)).length > 0 || Boolean(file);
  useEffect(() => { if (editing) document.getElementById("restaurant-profile-name")?.focus(); }, [editing]);

  function edit() {
    setForm(restaurantForm(restaurant)); setFile(null); setErrors({}); setError(""); setSuccess(""); setEditing(true);
  }
  function cancel() {
    setEditing(false); setFile(null); setErrors({}); setError(""); setForm(restaurantForm(restaurant));
  }
  function review(event) {
    event.preventDefault();
    const validation = { ...validateRestaurant(restaurant, form), image: errors.image || validateAvatar(file) };
    setErrors(validation);
    const invalid = Object.keys(validation).find((key) => validation[key]);
    if (invalid) { document.getElementById(`restaurant-profile-${invalid}`)?.focus(); return; }
    if (!busyRef.current && changed) setConfirming(true);
  }
  async function save() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setSuccess("");
    let persisted = false;
    try {
      const saved = await saveRestaurantProfile({ current: restaurant, form, file, request: requestJson,
        onPersist: (value) => { persisted = true; onPersist(value); } });
      setForm(restaurantForm(saved)); setFile(null); setEditing(false);
      setSuccess("Restaurant details have been updated.");
    } catch (reason) {
      if (!onAuthError(reason)) setError(`${persisted ? "Restaurant details were saved, but the image change could not be completed. " : ""}${reason.message}`);
    } finally { setConfirming(false); busyRef.current = false; setBusy(false); }
  }

  const hasLocation = restaurant.latitude !== null && restaurant.longitude !== null;
  const operation = restaurant.operation;
  const operationLabel = restaurant.status !== "APPROVED" ? profileStatus(restaurant.status)
    : operation.is_open_now === null ? "Hours not configured" : operation.is_open_now ? "Open now" : "Closed now";

  return <section className="manager-profile-card restaurant-profile-card" id="restaurant" aria-labelledby="restaurant-information-title" aria-busy={busy}>
    <div className={`restaurant-profile-cover ${cover && failedImage !== cover ? "has-image" : ""}`}>
      {cover && failedImage !== cover ? <img src={cover} alt={`${restaurant.name} branding`} onError={() => setFailedImage(cover)} />
        : <div><Store size={36} aria-hidden="true" /><span>{cover ? "The restaurant image is unavailable right now." : "No restaurant branding image uploaded."}</span></div>}
    </div>
    <div className="restaurant-profile-content">
      <header className="manager-profile-card-heading"><div><h2 id="restaurant-information-title">Restaurant Details</h2><p>{restaurant.name}</p></div>
        {!editing && <button type="button" className="manager-profile-button secondary" onClick={edit}><Pencil size={15} /> Edit Restaurant Details</button>}
      </header>
      <Notice message={error} /><Notice message={success} type="success" />
      <div className="manager-profile-badges"><span>Approval: {profileStatus(restaurant.status)}</span><span>{operationLabel}</span></div>
      {editing ? <form onSubmit={review} noValidate>
        <div className="manager-profile-fields">
          {RESTAURANT_FIELDS.map(({ name, label, ...props }) => <ProfileField key={name} id={`restaurant-profile-${name}`} label={label} {...props}
            value={form[name]} error={errors[name]} disabled={busy}
            onChange={(event) => { setForm({ ...form, [name]: event.target.value }); setErrors({ ...errors, [name]: "" }); }} />)}
        </div>
        <p className="manager-profile-help">Changing address text does not move your map pin. Review the saved map location below if the restaurant has moved.</p>
        <div className="restaurant-profile-upload"><label htmlFor="restaurant-profile-image">Restaurant branding image</label>
          <ImageUploadField id="restaurant-profile-image" key={editing ? "editing" : "viewing"} file={file} disabled={busy} compact accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WebP · up to 5 MB" prompt={restaurant.branding_image_url ? "Replace restaurant branding image" : "Upload restaurant branding image"} error={errors.image}
            onSelect={(next) => { const message = validateAvatar(next); setErrors((value) => ({ ...value, image: message })); if (message) return false; setFile(next); return true; }}
            onRemove={() => { setFile(null); setErrors((value) => ({ ...value, image: "" })); }} />
          <p className="manager-profile-help">The image above previews your selection. Saving updates the primary branding image used on restaurant listings.</p>
        </div>
        <div className="manager-profile-actions"><button className="manager-profile-button secondary" type="button" disabled={busy} onClick={cancel}>Cancel</button>
          <button className="manager-profile-button" type="submit" disabled={busy || !changed}>{busy ? "Saving…" : "Save restaurant details"}</button></div>
      </form> : <>
        <p className="restaurant-profile-description">{restaurant.description || "No restaurant description provided."}</p>
        <dl className="manager-profile-details restaurant-profile-details">
          <Detail label="Restaurant name">{restaurant.name}</Detail><Detail label="Cuisine types">{restaurant.cuisine_type}</Detail>
          <Detail label="Contact email">{restaurant.email}</Detail><Detail label="Contact phone">{restaurant.phone}</Detail>
          <Detail label="Street address">{restaurant.address}</Detail><Detail label="City">{restaurant.city}</Detail>
          <Detail label="State">{restaurant.state}</Detail><Detail label="Postal code">{restaurant.pin_code}</Detail>
        </dl>
      </>}
      <section className="restaurant-profile-business" aria-labelledby="restaurant-business-title">
        <h3 id="restaurant-business-title"><ShieldCheck size={18} aria-hidden="true" />Business and account information</h3>
        <p className="manager-profile-help">Approval status and submitted verification documents are managed by DineBook administration.</p>
        <dl className="manager-profile-details"><Detail label="Restaurant created">{formatLocalDateTime(restaurant.created_at)}</Detail><Detail label="Last updated">{formatLocalDateTime(restaurant.updated_at)}</Detail>
          <Detail label="Operating hours today">{operation.schedule_configured ? operation.periods.length ? operation.periods.map((period) => `${formatWallTime(period.opens)} – ${formatWallTime(period.closes)}`).join(", ") : "Closed today" : "Not configured"}</Detail>
          <Detail label="Business timezone">{operation.timezone}</Detail>
        </dl>
        {restaurant.documents.length ? <ul className="restaurant-profile-documents">{restaurant.documents.map((document) => <li key={document.id}>
          <strong>{documentLabels[document.document_type] || profileStatus(document.document_type)}</strong><span>{document.file_name}</span><small>Submitted {formatLocalDateTime(document.created_at)}</small>
        </li>)}</ul> : <p className="manager-profile-help">No registration documents are available for this restaurant.</p>}
        <Link to="/manager/operating-hours" className="manager-profile-link">Manage operating hours</Link>
      </section>
      <section className="restaurant-profile-location" aria-labelledby="restaurant-location-title"><h3 id="restaurant-location-title"><MapPin size={18} aria-hidden="true" />Map location</h3>
        {hasLocation ? <>
          <iframe title="Saved restaurant map location" loading="lazy" referrerPolicy="no-referrer" src={`https://maps.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}&output=embed`} />
          <a className="manager-profile-link" href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer">View map <ExternalLink size={14} /></a>
        </> : <p className="manager-profile-help">No map location has been saved.</p>}
        <Link className="manager-profile-link" to="/manager/restaurant-location">{hasLocation ? "Edit map location" : "Set map location"}</Link>
      </section>
    </div>
    {confirming && <ConfirmActionDialog action="confirm" title="Update public restaurant details?" description="These details and the selected branding image are shown to customers. Approval status and verification documents will remain unchanged."
      confirmLabel="Save restaurant details" busy={busy} onCancel={() => !busy && setConfirming(false)} onConfirm={save} />}
  </section>;
}
