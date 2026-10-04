import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";

function CategoryForm({ category, onCancel, onSaved }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await requestJson(category ? `/api/manager/menu/categories/${category.id}` : "/api/manager/menu/categories", {
        method: category ? "PATCH" : "POST",
        body: JSON.stringify({ name: String(form.get("name")).trim(), description: String(form.get("description")).trim() || null, display_order: Number(form.get("display_order")), is_active: category ? form.get("is_active") === "on" : true }),
        fallbackMessage: "Unable to save category.",
      });
      await onSaved();
    } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-ink">Category name<input name="name" required maxLength="100" defaultValue={category?.name ?? ""} className="manager-menu-input mt-1.5" placeholder="e.g. Main Course" /></label>
    <label className="block text-sm font-medium text-ink">Description <span className="font-normal text-stone-400">(optional)</span><textarea name="description" rows="2" defaultValue={category?.description ?? ""} className="manager-menu-input mt-1.5" /></label>
    <label className="block text-sm font-medium text-ink">Display order<input name="display_order" type="number" min="0" defaultValue={category?.display_order ?? 0} className="manager-menu-input mt-1.5" /></label>
    {category && <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" name="is_active" defaultChecked={category.is_active} className="accent-wine" />Category is active</label>}
    <Notice message={error} />
    <div className="flex justify-end gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : category ? "Save category" : "Add category"}</button></div>
  </form>;
}

function FoodForm({ food, categories, initialCategoryId, onCancel, onSaved }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      category_id: form.get("category_id"), name: String(form.get("name")).trim(), description: String(form.get("description")).trim() || null,
      is_available: food ? form.get("is_available") === "on" : true,
    };
    setError(""); setSaving(true);
    try {
      const body = new FormData();
      body.append("payload", JSON.stringify(payload));
      await requestJson(food ? `/api/manager/menu/food/${food.id}` : "/api/manager/menu/food", { method: food ? "PATCH" : "POST", body, fallbackMessage: "Unable to save this dish." });
      await onSaved();
    } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-ink">Dish name<input name="name" required maxLength="255" defaultValue={food?.name ?? ""} className="manager-menu-input mt-1.5" placeholder="e.g. Paneer Tikka" /></label>
    <label className="block text-sm font-medium text-ink">Category<select name="category_id" required defaultValue={food?.category_id ?? initialCategoryId ?? categories.find((category) => category.is_active)?.id ?? ""} className="manager-menu-input mt-1.5">{categories.filter((category) => category.is_active || category.id === food?.category_id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label className="block text-sm font-medium text-ink">Description<textarea name="description" rows="3" defaultValue={food?.description ?? ""} className="manager-menu-input mt-1.5" /></label>
    {food && <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" name="is_available" defaultChecked={food.is_available} className="accent-wine" />Available to customers</label>}
    <Notice message={error} />
    <div className="flex justify-end gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : food ? "Save changes" : "Add dish"}</button></div>
  </form>;
}

function DeleteConfirmation({ target, busy, onCancel, onConfirm }) {
  const isCategory = target.type === "category";
  const name = isCategory ? target.item.name : target.item.name;
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600"><Trash2 size={19} /></div>
      <h3 id="delete-dialog-title" className="text-lg font-bold text-ink">Move {isCategory ? "category" : "dish"} to deleted items?</h3>
      <p id="delete-dialog-description" className="mt-2 text-sm leading-6 text-stone-600"><strong>{name}</strong>{isCategory && target.item.foods.length > 0 ? ` and its ${target.item.foods.length} dish${target.item.foods.length === 1 ? "" : "es"}` : ""} will be moved out of the active menu.</p>
      <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{busy ? "Deleting…" : "Move to deleted items"}</button></div>
    </section>
  </div>;
}

export default function ManagerMenuPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState("");
  const loadMenu = useCallback(async () => {
    setLoading(true);
    try { setCategories(await requestJson("/api/manager/menu", { fallbackMessage: "Unable to load the menu." })); setError(""); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadMenu(); }, [loadMenu]);
  const normalized = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.map((category) => {
      const categoryMatches = `${category.name} ${category.description ?? ""}`.toLowerCase().includes(needle);
      const foods = category.foods.filter((food) => !needle || categoryMatches || `${food.name} ${food.description ?? ""}`.toLowerCase().includes(needle));
      return { ...category, foods };
    }).filter((category) => !needle || category.name.toLowerCase().includes(needle) || (category.description ?? "").toLowerCase().includes(needle) || category.foods.length > 0);
  }, [categories, query]);

  async function deleteFood(food) {
    setBusyId(food.id);
    try { await requestJson(`/api/manager/menu/food/${food.id}`, { method: "DELETE", fallbackMessage: "Unable to delete this dish." }); await loadMenu(); }
    catch (reason) { setError(reason.message); }
    finally { setBusyId(""); setDeleteTarget(null); }
  }
  async function deleteCategory(category) {
    setBusyId(category.id);
    try { await requestJson(`/api/manager/menu/categories/${category.id}`, { method: "DELETE", fallbackMessage: "Unable to delete this category." }); await loadMenu(); }
    catch (reason) { setError(reason.message); }
    finally { setBusyId(""); setDeleteTarget(null); }
  }
  async function toggleFood(food) {
    setBusyId(food.id);
    const payload = { category_id: food.category_id, name: food.name, description: food.description, is_available: !food.is_available };
    const body = new FormData();
    body.append("payload", JSON.stringify(payload));
    try { await requestJson(`/api/manager/menu/food/${food.id}`, { method: "PATCH", body, fallbackMessage: "Unable to update availability." }); await loadMenu(); }
    catch (reason) { setError(reason.message); }
    finally { setBusyId(""); }
  }

  return <ManagerLayout title="Menu Management"><div className="manager-dashboard-content">
    <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Menu" }]} className="manager-breadcrumb" />
    <div className="manager-heading flex flex-wrap items-end justify-between gap-4"><div><h2>Restaurant Menu</h2><p>Manage menu categories and dishes.</p></div><div className="flex gap-2"><button onClick={() => setModal({ type: "category" })} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-wine hover:bg-stone-50"><Plus size={15} />Category</button><button onClick={() => setModal({ type: "food" })} disabled={!categories.some((category) => category.is_active)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-wine px-4 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"><Plus size={16} />Add dish</button></div></div>
    <section className="manager-menu-panel rounded-xl border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4 sm:px-6"><div><h3 className="font-semibold text-ink">Menu categories</h3><p className="mt-1 text-xs text-stone-500">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p></div><label className="manager-menu-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" aria-label="Search menu" /></label></header>
      <div className="p-4 sm:p-6"><Notice message={error} />
        {loading ? <p className="py-12 text-center text-sm text-stone-500">Loading menu…</p> : categories.length === 0 ? <div className="rounded-lg border border-dashed border-stone-200 px-5 py-14 text-center"><Utensils className="mx-auto text-stone-300" size={26} /><p className="mt-3 text-sm font-semibold text-stone-600">Start with a menu category</p><p className="mt-1 text-xs text-stone-400">Create a category, then add dishes to it.</p><button onClick={() => setModal({ type: "category" })} className="mt-4 rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-white">Add category</button></div> : normalized.length === 0 ? <p className="py-10 text-center text-sm text-stone-500">No menu items match “{query}”.</p> : <div className="space-y-6">{normalized.map((category) => <section key={category.id} className="overflow-hidden rounded-lg border border-stone-100">
          <header className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-4 py-3"><div><h4 className="text-sm font-bold text-ink">{category.name}<span className="ml-2 text-xs font-medium text-stone-400">{category.foods.length}</span>{!category.is_active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-600">Inactive</span>}</h4>{category.description && <p className="mt-1 text-xs text-stone-500">{category.description}</p>}</div><div className="flex gap-1"><button onClick={() => setModal({ type: "category", category })} aria-label={`Edit ${category.name}`} className="grid h-8 w-8 place-items-center rounded text-stone-400 hover:bg-white"><Pencil size={14} /></button><button onClick={() => setDeleteTarget({ type: "category", item: category })} disabled={busyId === category.id} aria-label={`Delete ${category.name}`} className="grid h-8 w-8 place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button><button onClick={() => setModal({ type: "food", category_id: category.id })} disabled={!category.is_active} className="ml-1 inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-wine disabled:opacity-40"><Plus size={13} />Dish</button></div></header>
          <div className="divide-y divide-stone-100">{category.foods.length === 0 ? <p className="px-4 py-6 text-center text-xs text-stone-400">No dishes in this category yet.</p> : category.foods.map((food) => <article key={food.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h5 className="font-semibold text-ink">{food.name}</h5><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${food.is_available ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{food.is_available ? "Available" : "Unavailable"}</span></div>{food.description && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{food.description}</p>}</div>
            <div className="flex items-center justify-end gap-2"><button type="button" onClick={() => toggleFood(food)} disabled={busyId === food.id} aria-label={`Toggle availability for ${food.name}`} className={`relative h-6 w-11 rounded-full ${food.is_available ? "bg-emerald-500" : "bg-stone-300"} disabled:opacity-50`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${food.is_available ? "left-6" : "left-1"}`} /></button><button onClick={() => setModal({ type: "food", food })} aria-label={`Edit ${food.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Pencil size={15} /></button><button onClick={() => setDeleteTarget({ type: "food", item: food })} disabled={busyId === food.id} aria-label={`Delete ${food.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div>
          </article>)}</div>
        </section>)}</div>}
      </div>
    </section>
  </div>
  {modal && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section role="dialog" aria-modal="true" aria-labelledby="menu-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><header className="mb-5 flex items-start justify-between"><div><h3 id="menu-form-title" className="text-lg font-bold text-ink">{modal.type === "category" ? modal.category ? "Edit category" : "Add a category" : modal.food ? "Edit dish" : "Add a dish"}</h3><p className="mt-1 text-xs text-stone-500">{modal.type === "category" ? "Organize dishes into menu sections." : "Add or update a dish in this category."}</p></div><button onClick={() => setModal(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100"><X size={18} /></button></header>{modal.type === "category" ? <CategoryForm key={modal.category?.id ?? "category-new"} category={modal.category} onCancel={() => setModal(null)} onSaved={async () => { setModal(null); await loadMenu(); }} /> : <FoodForm key={modal.food?.id ?? `food-new-${modal.category_id ?? ""}`} food={modal.food} categories={categories} initialCategoryId={modal.category_id} onCancel={() => setModal(null)} onSaved={async () => { setModal(null); await loadMenu(); }} />}</section></div>}
  {deleteTarget && <DeleteConfirmation target={deleteTarget} busy={busyId === deleteTarget.item.id} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget.type === "category" ? deleteCategory(deleteTarget.item) : deleteFood(deleteTarget.item)} />}
  </ManagerLayout>;
}
