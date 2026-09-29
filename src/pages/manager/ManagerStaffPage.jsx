import { useCallback, useEffect, useState } from "react";
import { ChefHat, Plus, Trash2, Users } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { FormField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestJson("/api/manager/staff", {
        method: "GET",
        fallbackMessage: "Unable to load staff.",
      });
      setStaff(result);
      setError("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleAddChef(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const formElement = event.currentTarget;
    setError("");
    setSuccess("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await requestJson("/api/manager/staff", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name").trim(),
          email: form.get("email").trim().toLowerCase(),
        }),
        fallbackMessage: "Unable to add chef.",
      });
      formElement.reset();
      setSuccess("Chef added. Their sign-in email and temporary password have been sent.");
      await loadStaff();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveChef(chef) {
    if (!window.confirm(`Deactivate ${chef.name}'s chef account?`)) return;
    setError("");
    try {
      await requestJson(`/api/manager/staff/${chef.id}`, { method: "DELETE" });
      setSuccess(`${chef.name}'s account has been deactivated.`);
      await loadStaff();
    } catch (reason) {
      setError(reason.message);
    }
  }

  return (
    <ManagerLayout title="Staff Management">
      <div className="manager-dashboard-content">
        <div className="manager-breadcrumb"><span>Home</span><span>/</span><strong>Staff</strong></div>
        <div className="manager-heading"><div><h2>Restaurant Staff</h2><p>Add and manage staff accounts for your restaurant.</p></div></div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-wine/10 text-wine"><ChefHat size={19} /></span><div><h3 className="font-semibold text-ink">Add a Chef</h3><p className="mt-1 text-xs text-stone-500">Sign-in credentials will be emailed to the chef.</p></div></div>
            <form onSubmit={handleAddChef} noValidate>
              <FormField id="name" label="Chef Full Name" placeholder="Enter the chef’s name" autoComplete="name" minLength={2} required />
              <FormField id="email" label="Chef Email Address" type="email" placeholder="chef@restaurant.com" autoComplete="email" required />
              <p className="mb-4 text-xs leading-5 text-stone-500">We’ll email a temporary password to this address. The chef must change it at first sign-in.</p>
              <Notice message={error} />
              <Notice message={success} type="success" />
              <button type="submit" disabled={saving} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-wine px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"><Plus size={16} />{saving ? "Adding chef…" : "Add Chef"}</button>
            </form>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-stone-100 text-stone-600"><Users size={19} /></span><div><h3 className="font-semibold text-ink">Current Staff</h3><p className="mt-1 text-xs text-stone-500">{staff.length} chef{staff.length === 1 ? "" : "s"} on your team</p></div></div>
            {loading ? <p className="py-10 text-center text-sm text-stone-500">Loading staff…</p> : staff.length === 0 ? <div className="rounded-lg border border-dashed border-stone-200 px-5 py-12 text-center"><ChefHat className="mx-auto text-stone-300" size={24} /><p className="mt-3 text-sm font-medium text-stone-600">No chef accounts yet</p><p className="mt-1 text-xs text-stone-400">Add your first chef using the form.</p></div> : (
              <div className="divide-y divide-stone-100">
                {staff.map((chef) => (
                  <div key={chef.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{chef.name}</p><p className="mt-1 truncate text-xs text-stone-500">{chef.email}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${chef.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{chef.status}</span></div>
                    {chef.is_active && <button type="button" onClick={() => handleRemoveChef(chef)} aria-label={`Deactivate ${chef.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ManagerLayout>
  );
}
