import { useEffect, useRef, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import ConfirmActionDialog from "../ConfirmActionDialog.jsx";
import ImageCropDialog from "../manager/ImageCropDialog.jsx";
import Notice from "../auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import { formatLocalDateTime } from "../../lib/localDate.js";
import { profileForm, profilePatch, saveAccountProfile, validateAvatar, validateProfile } from "../../lib/customerProfile.js";
import { profileStatus } from "../../lib/managerProfile.js";
import { Detail, ProfileAvatar, ProfileField, useImagePreview } from "../manager/profile/ProfileParts.jsx";

export default function AccountInformation({ account, role, onPersist, onAuthError }) {
  const label = {
    chef: "Chef",
    manager: "Manager",
    admin: "Admin"
    }[role] || "Account";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => profileForm(account));
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busyRef = useRef(false);
  const inputRef = useRef(null);
  const saveController = useRef(null);
  useEffect(() => () => saveController.current?.abort(), []);
  const preview = useImagePreview(file);
  const photo = file ? preview : removing ? null : account.avatar_url;
  const changed = Object.keys(profilePatch(account, form)).length > 0 || Boolean(file) || (removing && Boolean(account.avatar_url));
  useEffect(() => { if (editing) document.getElementById(`${role}-profile-name`)?.focus(); }, [editing, role]);

  function edit() {
    setForm(profileForm(account)); setErrors({}); setError(""); setSuccess(""); setEditing(true);
  }
  function cancel() {
    setForm(profileForm(account)); setFile(null); setCrop(null); setRemoving(false);
    setErrors({}); setError(""); setEditing(false);
  }
  function selectPhoto(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    const message = validateAvatar(next);
    setErrors((current) => ({ ...current, avatar: message }));
    if (!message) setCrop(next);
  }
  async function save(event) {
    event.preventDefault();
    if (busyRef.current) return;
    const validation = { ...validateProfile(form), avatar: errors.avatar || validateAvatar(file) };
    setErrors(validation);
    const invalid = Object.keys(validation).find((key) => validation[key]);
    if (invalid) { document.getElementById(`${role}-profile-${invalid}`)?.focus(); return; }
    busyRef.current = true; setBusy(true); setError(""); setSuccess("");
    const controller = new AbortController();
    saveController.current = controller;
    let persisted = false;
    try {
      const saved = await saveAccountProfile({ current: account, form, file, removeAvatar: removing, basePath: `/api/${role}/profile`, request: (path, options) => requestJson(path, { ...options, signal: controller.signal }),
        onPersist: (value) => { if (!controller.signal.aborted) { persisted = true; onPersist(value); } } });
      if (controller.signal.aborted) return;
      setForm(profileForm(saved)); setFile(null); setRemoving(false); setEditing(false);
      setSuccess(`Your ${role} profile has been updated.`);
    } catch (reason) {
      if (!controller.signal.aborted && !onAuthError(reason)) setError(`${persisted ? "Your details were saved, but the photo change could not be completed. " : ""}${reason.message}`);
    } finally { busyRef.current = false; if (!controller.signal.aborted) setBusy(false); }
  }

  return <section className="manager-profile-card" aria-labelledby={`${role}-information-title`} aria-busy={busy}>
    <header className="manager-profile-card-heading"><div><h2 id={`${role}-information-title`}>{label} Details</h2><p>Your personal information and account.</p></div>
      {!editing && <button type="button" className="manager-profile-button secondary" onClick={edit}><Pencil size={15} /> Edit Profile</button>}
    </header>
    <Notice message={error} /><Notice message={success} type="success" />
    <form onSubmit={save} noValidate>
      <div className="manager-profile-identity">
        <ProfileAvatar name={account.name} src={photo} />
        <div><strong>{account.name}</strong><span>{account.email}</span>
          <div className="manager-profile-badges"><span>{profileStatus(account.role)}</span><span>{profileStatus(account.status)}</span></div>
          {editing && <div className="manager-profile-photo-controls">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Choose ${role} profile photo`} hidden disabled={busy} onChange={selectPhoto} />
            <button id={`${role}-profile-avatar`} className="manager-profile-button secondary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}><Camera size={15} /> {photo ? "Change photo" : "Upload photo"}</button>
            {photo && <button className="manager-profile-text-button" type="button" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove photo</button>}
            <small>JPEG, PNG, or WebP · up to 5 MB. Crop and preview before saving.</small>
            {errors.avatar && <small className="manager-profile-field-error" role="alert">{errors.avatar}</small>}
            {removing && <small>Your photo will be removed when you save changes.</small>}
          </div>}
        </div>
      </div>
      <div className="manager-profile-fields">
        <ProfileField id={`${role}-profile-name`} label="Full name" autoComplete="name" value={editing ? form.name : account.name} maxLength={120} required readOnly={!editing} disabled={busy} error={errors.name}
          onChange={(event) => { setForm({ ...form, name: event.target.value }); setErrors({ ...errors, name: "" }); }} />
        <ProfileField id={`${role}-profile-phone`} label="Phone number" type="tel" autoComplete="tel" value={editing ? form.phone : account.phone || ""} maxLength={20} readOnly={!editing} disabled={busy} error={errors.phone} hint={!editing && !account.phone ? "No phone number provided." : undefined}
          onChange={(event) => { setForm({ ...form, phone: event.target.value }); setErrors({ ...errors, phone: "" }); }} />
        <ProfileField id={`${role}-profile-email`} label="Sign-in email" type="email" value={account.email} readOnly hint="Your sign-in email is read-only." />
      </div>
      <dl className="manager-profile-details"><Detail label="Account created">{formatLocalDateTime(account.created_at)}</Detail><Detail label="Last updated">{formatLocalDateTime(account.updated_at)}</Detail></dl>
      {editing && <div className="manager-profile-actions"><button className="manager-profile-button secondary" type="button" disabled={busy} onClick={cancel}>Cancel</button><button className="manager-profile-button" type="submit" disabled={busy || !changed || Boolean(crop)}>{busy ? "Saving…" : "Save profile"}</button></div>}
    </form>
    {crop && <ImageCropDialog file={crop} title={`Crop ${role} profile photo`} description="Drag to position your photo and adjust the zoom. The square crop appears in a circle on your profile." aspectRatio={1} outputWidth={512} outputHeight={512} outputName={`${role}-avatar.jpg`} confirmLabel="Use this photo"
      onCancel={() => setCrop(null)} onCropped={(next) => { const message = validateAvatar(next); if (message) throw new Error(message); setFile(next); setRemoving(false); setCrop(null); setErrors((value) => ({ ...value, avatar: "" })); }} />}
    {confirmRemove && <ConfirmActionDialog action="remove" title="Remove your profile photo?" description="Save profile applies this removal. Cancel editing keeps your saved photo." onCancel={() => setConfirmRemove(false)}
      onConfirm={() => { setFile(null); setRemoving(true); setErrors((value) => ({ ...value, avatar: "" })); setConfirmRemove(false); }} />}
  </section>;
}
