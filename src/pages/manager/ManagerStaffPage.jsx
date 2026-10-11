import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Plus, Search, Trash2, Users } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { FormField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import Pagination from "../../components/Pagination.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [chefToDeactivate, setChefToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

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

  const matchingStaff = useMemo(() => staff.filter((chef) =>
    (!query.trim() || `${chef.name || ""} ${chef.email || ""} ${chef.id || ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    && (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? chef.is_active : !chef.is_active)),
  ).sort((left, right) => sort === "email" ? (left.email || "").localeCompare(right.email || "") : (left.name || "").localeCompare(right.name || "")), [staff, query, statusFilter, sort]);
  const visibleStaff = matchingStaff.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [query, statusFilter, sort, pageSize]);
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(matchingStaff.length / pageSize)))); }, [matchingStaff.length, pageSize]);

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

  async function handleRemoveChef() {
    if (!chefToDeactivate) return;
    setError("");
    setDeactivating(true);
    try {
      await requestJson(`/api/manager/staff/${chefToDeactivate.id}`, { method: "DELETE" });
      setSuccess(`${chefToDeactivate.name}'s account has been deactivated.`);
      await loadStaff();
      setChefToDeactivate(null);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <ManagerLayout title="Staff Management">
      <div className="manager-dashboard-content">
        <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Staff" }]} className="manager-breadcrumb" />
        <div className="manager-heading"><div><h2>Restaurant Staff</h2><p>Add and manage staff accounts for your restaurant.</p></div></div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="manager-staff-panel rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
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

          <section className="manager-staff-panel rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-stone-100 text-stone-600"><Users size={19} /></span><div><h3 className="font-semibold text-ink">Current Staff</h3><p className="mt-1 text-xs text-stone-500">{staff.length} chef{staff.length === 1 ? "" : "s"} on your team</p></div></div>
            <>{staff.length > 0 && <div className="mb-4 flex flex-wrap gap-3"><label className="manager-menu-search"><Search size={15} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or ID" aria-label="Search staff" /></label><label className="text-sm">Status <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All staff</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><label className="text-sm">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name A–Z</option><option value="email">Email A–Z</option></select></label></div>}{loading ? <p className="py-10 text-center text-sm text-stone-500">Loading staff…</p> : staff.length === 0 ? <div className="rounded-lg border border-dashed border-stone-200 px-5 py-12 text-center"><ChefHat className="mx-auto text-stone-300" size={24} /><p className="mt-3 text-sm font-medium text-stone-600">No chef accounts yet</p><p className="mt-1 text-xs text-stone-400">Add your first chef using the form.</p></div> : matchingStaff.length === 0 ? <p className="py-10 text-center text-sm text-stone-500">No staff match these filters.</p> : (
              <div className="divide-y divide-stone-100">
                {visibleStaff.map((chef) => (
                  <div key={chef.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{chef.name}</p><p className="mt-1 truncate text-xs text-stone-500">{chef.email}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${chef.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{chef.status}</span></div>
                    {chef.is_active && <button type="button" onClick={() => setChefToDeactivate(chef)} aria-label={`Deactivate ${chef.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            )}{matchingStaff.length > 0 && <Pagination page={page} pageSize={pageSize} total={matchingStaff.length} onPageChange={setPage} onPageSizeChange={setPageSize} label="staff members" />}</>
          </section>
        </div>
      </div>
      {chefToDeactivate && <ConfirmActionDialog action="deactivate" resourceType="chef account" resourceName={chefToDeactivate.name} title="Deactivate this chef account?" description={`${chefToDeactivate.name} will lose chef portal access. Their staff record and order history will be preserved.`} busy={deactivating} onCancel={() => { if (!deactivating) setChefToDeactivate(null); }} onConfirm={handleRemoveChef} />}
    </ManagerLayout>
  );
}
