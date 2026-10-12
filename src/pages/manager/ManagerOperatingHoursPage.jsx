import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { requestJson } from "../../lib/authApi.js";
import "./ManagerOperatingHoursPage.css";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function ManagerOperatingHoursPage() {
  const [schedule, setSchedule] = useState(null);
  const [draft, setDraft] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [form, setForm] = useState({ start_date: "", end_date: "", is_closed: true, periods: [{ opens: "09:00", closes: "17:00" }], reason: "", internal_note: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingException, setEditingException] = useState(null);
  const hasUnsavedSchedule = Boolean(schedule) && JSON.stringify(schedule.days.map(({ day, periods }) => ({ day, periods })) ) !== JSON.stringify(draft.map(({ day, periods }) => ({ day, periods })));

  async function load() {
    setLoading(true);
    try {
      const data = await requestJson("/api/manager/operating-hours");
      setSchedule(data);
      setDraft(data.days.map((day) => ({ day: day.day, periods: day.periods || [] })));
      setExceptions(data.exceptions || []);
      setError("");
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function updatePeriod(dayIndex, periodIndex, key, value) {
    setDraft((current) => current.map((day, index) => index !== dayIndex ? day : ({ ...day, periods: day.periods.map((period, pIndex) => pIndex !== periodIndex ? period : ({ ...period, [key]: value })) })));
  }
  function addPeriod(index) {
    setDraft((current) => current.map((day, dayIndex) => dayIndex !== index || day.periods.length >= 4 ? day : ({ ...day, periods: [...day.periods, { opens: "12:00", closes: "17:00" }] })));
  }
  function removePeriod(dayIndex, periodIndex) {
    setDraft((current) => current.map((day, index) => index !== dayIndex ? day : ({ ...day, periods: day.periods.filter((_, itemIndex) => itemIndex !== periodIndex) })));
  }
  function updateExceptionPeriod(periodIndex, key, value) {
    setForm((current) => ({ ...current, periods: current.periods.map((period, index) => index === periodIndex ? { ...period, [key]: value } : period) }));
  }
  async function saveSchedule() {
    setSaving(true); setError(""); setNotice("");
    async function submit(confirmAffected) {
      const result = await requestJson("/api/manager/operating-hours", { method: "PUT", body: JSON.stringify({ days: draft, confirm_affected_reservations: confirmAffected }) });
      setSchedule(result); setDraft(result.days.map((day) => ({ day: day.day, periods: day.periods || [] }))); setNotice("Weekly service hours saved.");
    }
    try { await submit(false); }
    catch (reason) {
      if (reason.message.includes("affects") && window.confirm(`${reason.message}\n\nApply the schedule change? Existing reservations will remain on record.`)) {
        try { await submit(true); } catch (confirmationError) { setError(confirmationError.message); }
      } else setError(reason.message);
    }
    finally { setSaving(false); }
  }
  async function createException(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const endpoint = editingException ? `/api/manager/operating-hours/exceptions/${editingException}` : "/api/manager/operating-hours/exceptions";
    const method = editingException ? "PUT" : "POST";
    const submit = (confirmAffected) => requestJson(endpoint, { method, body: JSON.stringify({
      start_date: form.start_date, end_date: form.end_date || form.start_date,
      is_closed: form.is_closed, periods: form.is_closed ? [] : form.periods,
      reason: form.reason || null, internal_note: form.internal_note || null,
      confirm_affected_reservations: confirmAffected,
    }) });
    try {
      try { await submit(false); }
      catch (reason) {
        if (!reason.message.includes("affects") || !window.confirm(`${reason.message}\n\nApply this exception? Existing reservations will remain on record.`)) throw reason;
        await submit(true);
      }
      setForm((current) => ({ ...current, start_date: "", end_date: "", reason: "", internal_note: "" }));
      setEditingException(null); setNotice(editingException ? "Schedule exception updated." : "Schedule exception added."); await load();
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }
  async function deleteException(id) {
    if (!window.confirm("Remove this schedule exception?")) return;
    try {
      try { await requestJson(`/api/manager/operating-hours/exceptions/${id}`, { method: "DELETE" }); }
      catch (reason) {
        if (!reason.message.includes("affects") || !window.confirm(`${reason.message}\n\nRemove the exception? Existing reservations will remain on record.`)) throw reason;
        await requestJson(`/api/manager/operating-hours/exceptions/${id}?confirm_affected_reservations=true`, { method: "DELETE" });
      }
      setNotice("Schedule exception removed."); await load();
    } catch (reason) { setError(reason.message); }
  }

  return <ManagerLayout title="Operating Hours & Availability"><div className="manager-dashboard-content">
    <section className="admin-restaurant-detail-card">
      <h2>Weekly service hours</h2><p>Times are interpreted in {schedule?.timezone || "Asia/Kolkata"}. Empty days are closed. Existing reservations are kept when you change this schedule.</p>
      {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}
      {loading ? <p>Loading schedule…</p> : <><p role="status">{hasUnsavedSchedule ? "You have unsaved schedule changes." : "Schedule is up to date."}</p><div className="admin-restaurant-hours">{draft.map((day, index) => <article key={day.day} className="operating-hours-day">
        <strong>{day.day[0].toUpperCase() + day.day.slice(1)}</strong>
        <div className="operating-period-list">{day.periods.length ? day.periods.map((period, periodIndex) => <div className="operating-period" key={`${day.day}-${periodIndex}`}>
          <label>Opens <input type="time" value={period.opens} onChange={(event) => updatePeriod(index, periodIndex, "opens", event.target.value)} /></label>
          <label>Closes <input type="time" value={period.closes} onChange={(event) => updatePeriod(index, periodIndex, "closes", event.target.value)} /></label>
          <button type="button" onClick={() => removePeriod(index, periodIndex)} aria-label={`Remove ${day.day} period`}><Trash2 size={16} /></button>
        </div>) : <span>Closed</span>}</div>
        {day.periods.length < 4 && <button type="button" onClick={() => addPeriod(index)}><Plus size={15} /> Add period</button>}
      </article>)}</div></>}
      <button type="button" disabled={loading || saving || !hasUnsavedSchedule} onClick={saveSchedule}><Save size={16} /> {saving ? "Saving…" : "Save weekly hours"}</button><button type="button" disabled={loading || saving || !hasUnsavedSchedule} onClick={() => setDraft(schedule.days.map((day) => ({ day: day.day, periods: day.periods || [] })))}>Cancel changes</button>
    </section>
    <section className="admin-restaurant-detail-card">
      <h2>Closures and special hours</h2><p>Date-specific exceptions override the weekly schedule. Internal notes are visible to managers and administrators only.</p>
      <form onSubmit={createException} className="operating-exception-form">
        <label>Start date <input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></label>
        <label>End date <input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></label>
        <label>Schedule <select value={form.is_closed ? "closed" : "special"} onChange={(event) => setForm({ ...form, is_closed: event.target.value === "closed" })}><option value="closed">Closed</option><option value="special">Special hours</option></select></label>
        {!form.is_closed && <div className="exception-periods">{form.periods.map((period, index) => <div className="operating-period" key={index}><label>Opens <input required type="time" value={period.opens} onChange={(event) => updateExceptionPeriod(index, "opens", event.target.value)} /></label><label>Closes <input required type="time" value={period.closes} onChange={(event) => updateExceptionPeriod(index, "closes", event.target.value)} /></label><button type="button" onClick={() => setForm((current) => ({ ...current, periods: current.periods.filter((_, periodIndex) => periodIndex !== index) }))} aria-label="Remove special-hours period"><Trash2 size={16} /></button></div>)}{form.periods.length < 4 && <button type="button" onClick={() => setForm((current) => ({ ...current, periods: [...current.periods, { opens: "12:00", closes: "17:00" }] }))}><Plus size={15} /> Add period</button>}</div>}
        <label>Public reason <input maxLength={500} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Holiday hours" /></label>
        <label>Internal note <input maxLength={1000} value={form.internal_note} onChange={(event) => setForm({ ...form, internal_note: event.target.value })} /></label>
        <button type="submit" disabled={saving}>{editingException ? "Save exception" : "Add exception"}</button>{editingException && <button type="button" onClick={() => { setEditingException(null); setForm({ start_date: "", end_date: "", is_closed: true, periods: [{ opens: "09:00", closes: "17:00" }], reason: "", internal_note: "" }); }}>Cancel edit</button>}
      </form>
      {exceptions.length ? <ul className="operating-exception-list">{exceptions.map((item) => <li key={item.id}><div><strong>{item.start_date}{item.end_date !== item.start_date ? ` – ${item.end_date}` : ""}</strong><span>{item.is_closed ? "Closed" : item.periods.map((period) => `${period.opens}–${period.closes}`).join(", ")}</span>{item.reason && <small>{item.reason}</small>}{item.internal_note && <small>Internal: {item.internal_note}</small>}</div><button type="button" onClick={() => { setEditingException(item.id); setForm({ start_date: item.start_date, end_date: item.end_date, is_closed: item.is_closed, periods: item.periods?.length ? item.periods : [{ opens: "09:00", closes: "17:00" }], reason: item.reason || "", internal_note: item.internal_note || "" }); }} aria-label="Edit exception">Edit</button><button type="button" onClick={() => deleteException(item.id)} aria-label="Delete exception"><Trash2 size={16} /></button></li>)}</ul> : <p>No upcoming exceptions.</p>}
    </section>
  </div></ManagerLayout>;
}
