import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Pencil, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ImageUploadField from "../../components/manager/ImageUploadField.jsx";
import ImageCropDialog from "../../components/manager/ImageCropDialog.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import Notice from "../../components/auth/Notice.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
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

function FoodExtras({ food, onChanged, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  async function saveVariant(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = { name: String(form.get("name")).trim(), price: Number(form.get("price")), is_available: editing ? form.get("is_available") === "on" : true };
    setBusy(true); setError("");
    try {
      await requestJson(`/api/manager/menu/food/${food.id}/variants${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", body: JSON.stringify(body), fallbackMessage: "Unable to save variant." });
      formElement.reset(); setEditing(null); await onChanged();
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  }
  async function removeVariant(variant) {
    setBusy(true); setError("");
    try { await requestJson(`/api/manager/menu/food/${food.id}/variants/${variant.id}`, { method: "DELETE" }); await onChanged(); }
    catch (reason) { setError(reason.message); return false; } finally { setBusy(false); }
    return true;
  }
  async function uploadImage(image) {
    if (!image) return false;
    const body = new FormData(); body.append("image", image);
    setBusy(true); setError(""); setImageMessage("");
    try { await requestJson(`/api/manager/menu/food/${food.id}/images`, { method: "POST", body, fallbackMessage: "Unable to upload image." }); setCropFile(null); setImageMessage("Food image updated successfully."); await onChanged(); return true; }
    catch (reason) { setError(reason.message); return false; } finally { setBusy(false); }
  }
  async function removeImage() {
    if (!food.image_id) return;
    setBusy(true); setError(""); setImageMessage("");
    try { await requestJson(`/api/manager/menu/food/${food.id}/images/${food.image_id}`, { method: "DELETE" }); setImageMessage("Food image removed."); await onChanged(); }
    catch (reason) { setError(reason.message); return false; } finally { setBusy(false); }
    return true;
  }
  return <div className="manager-menu-food-extras col-span-full mt-3 border-t border-stone-100 pt-3">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-xs font-semibold text-wine"><ImageIcon size={14} />{open ? "Hide variants and food image" : `Manage variants and food image${food.variants?.length ? ` (${food.variants.length} variants)` : ""}`}</button>
    {open && <div className="manager-menu-assets-grid mt-4">
      <section className="manager-menu-asset-card">
        <header className="manager-menu-asset-heading"><div><h6>Variants and prices</h6><p>Set customer-facing sizes and prices.</p></div><span>{food.variants?.length ?? 0}</span></header>
        {food.variants?.length ? <ul className="manager-menu-variant-list">{food.variants.map((variant) => <li key={variant.id}>
          <div className="manager-menu-variant-info"><strong>{variant.name}</strong><span>₹{Number(variant.price).toFixed(2)}</span></div>
          <div className="manager-menu-variant-actions"><span className={`manager-menu-variant-status ${variant.is_available ? "available" : "unavailable"}`}>{variant.is_available ? "Available" : "Unavailable"}</span><button type="button" onClick={() => setEditing(variant)}>Edit</button><button type="button" disabled={busy} onClick={() => setConfirmation({ type: "variant", item: variant })}>Delete</button></div>
        </li>)}</ul> : <p className="manager-menu-assets-empty">No variants yet. Add a size or serving option below.</p>}
        <form onSubmit={saveVariant} className="manager-menu-variant-form"><input key={editing?.id ?? "new-name"} name="name" required maxLength="100" defaultValue={editing?.name ?? ""} placeholder="Variant name" aria-label="Variant name" className="manager-menu-input" /><input key={editing?.id ?? "new-price"} name="price" type="number" min="0" step="0.01" required defaultValue={editing?.price ?? ""} placeholder="Price" aria-label="Variant price" className="manager-menu-input" /><div className="flex items-center gap-2">{editing && <label className="flex items-center gap-1 text-xs text-stone-500"><input type="checkbox" name="is_available" defaultChecked={editing.is_available} />Available</label>}<button disabled={busy} className="rounded bg-wine px-3 py-2 text-xs font-semibold text-white">{editing ? "Save" : "Add variant"}</button>{editing && <button type="button" onClick={() => setEditing(null)} className="px-2 text-xs text-stone-500">Cancel</button>}</div></form>
      </section>
      <section className="manager-menu-asset-card">
        <header className="manager-menu-asset-heading"><div><h6>Food image</h6><p>One image is shared across menus and all variants.</p></div><span>{food.image_url ? "1 / 1" : "0 / 1"}</span></header>
        {food.image_url ? <figure className="manager-menu-primary-image"><img src={food.image_url} alt={`${food.name} food item`} /><figcaption><span>Primary food image</span><button type="button" disabled={busy} onClick={() => setConfirmation({ type: "image", item: food })} aria-label={`Remove image for ${food.name}`}>Remove</button></figcaption></figure> : <p className="manager-menu-assets-empty">No food image uploaded yet.</p>}
        <ImageUploadField key={`${food.image_id || "none"}-${food.image_url || "empty"}`} id={`food-image-${food.id}`} accept="image/jpeg,image/png,image/webp" prompt={food.image_url ? "Replace the food image" : "Upload a food image"} hint="JPEG, PNG, or WebP · up to 10 MB" onSelect={(image) => { setCropFile(image); return false; }} disabled={busy} compact />
        {(busy || imageMessage) && <p className="manager-menu-image-message" role="status">{busy ? "Uploading food image…" : imageMessage}</p>}
      </section>
    </div>}
    {open && <Notice message={error} />}
    {confirmation && <ConfirmActionDialog action="delete" resourceType={confirmation.type === "image" ? "food image" : "menu variant"} resourceName={confirmation.type === "image" ? food.name : confirmation.item.name} title={confirmation.type === "image" ? "Remove this food image?" : "Move this variant to deleted items?"} description={confirmation.type === "image" ? `The primary image for ${food.name} will be permanently removed.` : `${confirmation.item.name} will be moved out of the active menu and can no longer be ordered.`} confirmLabel={confirmation.type === "image" ? "Remove image" : "Delete variant"} onCancel={() => setConfirmation(null)} onConfirm={async () => { const done = confirmation.type === "image" ? await removeImage() : await removeVariant(confirmation.item); if (done) setConfirmation(null); }} />}
    <ImageCropDialog file={cropFile} title={`Crop ${food.name} image`} description="Drag to position the dish image. The menu uses a 4:3 crop." aspectRatio={4 / 3} outputWidth={1200} outputHeight={900} outputName="food-image.jpg" confirmLabel="Use this image" onCancel={() => setCropFile(null)} onCropped={uploadImage} />
  </div>;
}

export default function ManagerMenuPage() {
  const navigate = useNavigate();
  const { foodId } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [menuSort, setMenuSort] = useState("name");
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
  const selectedFood = useMemo(() => {
    if (!foodId) return null;
    for (const category of categories) {
      const food = category.foods?.find((item) => String(item.id) === foodId);
      if (food) return { ...food, category_name: category.name };
    }
    return null;
  }, [categories, foodId]);
  const normalized = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.filter((category) => categoryFilter === "ALL" || category.id === categoryFilter).map((category) => {
      const categoryMatches = `${category.name} ${category.description ?? ""}`.toLowerCase().includes(needle);
      const foods = category.foods.filter((food) => (!needle || categoryMatches || `${food.name} ${food.description ?? ""}`.toLowerCase().includes(needle)) && (availabilityFilter === "ALL" || (availabilityFilter === "AVAILABLE" ? food.is_available : !food.is_available))).sort((left, right) => {
        if (menuSort === "price-low" || menuSort === "price-high") {
          const price = (food) => Math.min(...(food.variants || []).map((variant) => Number(variant.price)).filter(Number.isFinite), Number.POSITIVE_INFINITY);
          const delta = price(left) - price(right);
          return menuSort === "price-low" ? delta : -delta;
        }
        return menuSort === "name-desc" ? right.name.localeCompare(left.name) : left.name.localeCompare(right.name);
      });
      return { ...category, foods };
    }).filter((category) => {
      const categoryMatches = Boolean(needle) && `${category.name} ${category.description ?? ""}`.toLowerCase().includes(needle);
      return (!needle && availabilityFilter === "ALL") || categoryMatches || category.foods.length > 0;
    });
  }, [categories, query, categoryFilter, availabilityFilter, menuSort]);

  async function deleteFood(food) {
    setBusyId(food.id);
    try { await requestJson(`/api/manager/menu/food/${food.id}`, { method: "DELETE", fallbackMessage: "Unable to delete this dish." }); if (String(food.id) === foodId) navigate("/manager/menu", { replace: true }); await loadMenu(); }
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
    <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={foodId ? [{ label: "Menu", to: "/manager/menu" }, { label: selectedFood?.name || "Food item" }] : [{ label: "Menu" }]} className="manager-breadcrumb" />
    <div className="manager-heading flex flex-wrap items-end justify-between gap-4"><div><h2>{foodId ? selectedFood?.name || "Food item" : "Restaurant Menu"}</h2><p>{foodId ? "Review this dish, its variants, and its images." : "Manage menu categories and dishes."}</p></div>{foodId ? <button onClick={() => navigate("/manager/menu")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-wine hover:bg-stone-50"><ArrowLeft size={15} />Back to menu</button> : <div className="flex gap-2"><button onClick={() => setModal({ type: "category" })} className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-wine hover:bg-stone-50"><Plus size={15} />Category</button><button onClick={() => setModal({ type: "food" })} disabled={!categories.some((category) => category.is_active)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-wine px-4 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"><Plus size={16} />Add dish</button></div>}</div>
    {foodId ? <>
      <Notice message={error} />
      {loading ? <p className="py-12 text-center text-sm text-stone-500">Loading dish…</p> : !selectedFood ? <section className="manager-menu-item-detail"><p>This menu item could not be found.</p><button onClick={() => navigate("/manager/menu")} className="manager-menu-detail-back"><ArrowLeft size={15} />Back to menu</button></section> : <section className="manager-menu-item-detail">
        <div className="manager-menu-food-detail-summary">
          {selectedFood.image_url ? <img src={selectedFood.image_url} alt={selectedFood.name} /> : <div className="manager-menu-food-detail-placeholder"><Utensils size={30} /></div>}
          <div className="manager-menu-food-detail-copy"><span className="manager-menu-food-category">{selectedFood.category_name}</span><div className="manager-menu-food-detail-title"><h3>{selectedFood.name}</h3><span className={`manager-menu-food-status ${selectedFood.is_available ? "available" : "unavailable"}`}>{selectedFood.is_available ? "Available" : "Unavailable"}</span></div><p className="manager-menu-food-restaurant">{selectedFood.restaurant_name}</p><p>{selectedFood.description || "No description has been added."}</p>{selectedFood.variants?.length > 0 && <div className="manager-menu-detail-prices">{selectedFood.variants.map((variant) => <span key={variant.id}>{variant.name}<strong>₹{Number(variant.price).toFixed(2)}</strong></span>)}</div>}
            <div className="manager-menu-detail-actions"><button onClick={() => setModal({ type: "food", food: selectedFood })}><Pencil size={15} />Edit dish</button><button type="button" onClick={() => toggleFood(selectedFood)} disabled={busyId === selectedFood.id}>{selectedFood.is_available ? "Mark unavailable" : "Mark available"}</button><button className="danger" onClick={() => setDeleteTarget({ type: "food", item: selectedFood })}><Trash2 size={15} />Delete dish</button></div>
          </div>
        </div>
        <FoodExtras key={selectedFood.id} food={selectedFood} onChanged={loadMenu} defaultOpen />
      </section>}
    </> : <section className="manager-menu-panel rounded-xl border border-stone-200 bg-white shadow-sm">
      <header className="manager-menu-panel-header">
        <div className="manager-menu-panel-title"><h3 className="font-semibold text-ink">Menu categories</h3><p className="mt-1 text-xs text-stone-500">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p></div>
        <div className="manager-menu-panel-filters">
          <label className="manager-menu-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dishes or categories" aria-label="Search menu" /></label>
          <label className="sr-only" htmlFor="menu-category-filter">Filter by category</label>
          <select id="menu-category-filter" className="manager-menu-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <label className="sr-only" htmlFor="menu-availability-filter">Filter by availability</label>
          <select id="menu-availability-filter" className="manager-menu-input" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option value="ALL">All availability</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option></select>
          <label className="sr-only" htmlFor="menu-sort">Sort menu</label>
          <select id="menu-sort" className="manager-menu-input" value={menuSort} onChange={(event) => setMenuSort(event.target.value)}><option value="name">Dish name A–Z</option><option value="name-desc">Dish name Z–A</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
        </div>
      </header>
      <div className="p-4 sm:p-6"><Notice message={error} />
        {loading ? <p className="py-12 text-center text-sm text-stone-500">Loading menu…</p> : categories.length === 0 ? <div className="rounded-lg border border-dashed border-stone-200 px-5 py-14 text-center"><Utensils className="mx-auto text-stone-300" size={26} /><p className="mt-3 text-sm font-semibold text-stone-600">Start with a menu category</p><p className="mt-1 text-xs text-stone-400">Create a category, then add dishes to it.</p><button onClick={() => setModal({ type: "category" })} className="mt-4 rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-white">Add category</button></div> : normalized.length === 0 ? <p className="py-10 text-center text-sm text-stone-500">No menu items match “{query}”.</p> : <div className="space-y-6">{normalized.map((category) => <section key={category.id} className="overflow-hidden rounded-lg border border-stone-100">
          <header className="manager-menu-category-heading flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-4 py-3"><div><h4 className="text-sm font-bold text-ink">{category.name}<span className="ml-2 text-xs font-medium text-stone-400">{category.foods.length}</span>{!category.is_active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-600">Inactive</span>}</h4>{category.description && <p className="mt-1 text-xs text-stone-500">{category.description}</p>}</div><div className="flex gap-1"><button onClick={() => setModal({ type: "category", category })} aria-label={`Edit ${category.name}`} className="grid h-8 w-8 place-items-center rounded text-stone-400 hover:bg-white"><Pencil size={14} /></button><button onClick={() => setDeleteTarget({ type: "category", item: category })} disabled={busyId === category.id} aria-label={`Delete ${category.name}`} className="grid h-8 w-8 place-items-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button><button onClick={() => setModal({ type: "food", category_id: category.id })} disabled={!category.is_active} className="ml-1 inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-wine disabled:opacity-40"><Plus size={13} />Dish</button></div></header>
          <div className="manager-menu-food-list">{category.foods.length === 0 ? <p className="manager-menu-empty-category px-4 py-6 text-center text-xs text-stone-400">No dishes in this category yet.</p> : category.foods.map((food) => <article key={food.id} className="manager-menu-food-card">
            <button type="button" onClick={() => navigate(`/manager/menu/${food.id}`)} className="manager-menu-food-open" aria-label={`Open ${food.name} details`}><div className="manager-menu-food-card-art">{food.image_url ? <img src={food.image_url} alt="" /> : <Utensils size={23} />}</div><div className="manager-menu-food-card-copy"><div className="flex flex-wrap items-center gap-2"><h5 className="font-semibold text-ink">{food.name}</h5><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${food.is_available ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{food.is_available ? "Available" : "Unavailable"}</span></div><p className="manager-menu-food-description">{food.description || "Open to view dish details and options."}</p>{food.variants?.length > 0 && <span className="manager-menu-food-variant-count">{food.variants.length} option{food.variants.length === 1 ? "" : "s"}</span>}</div></button>
            <div className="manager-menu-food-actions"><button type="button" onClick={() => toggleFood(food)} disabled={busyId === food.id} aria-label={`Toggle availability for ${food.name}`} className={`relative h-6 w-11 rounded-full ${food.is_available ? "bg-emerald-500" : "bg-stone-300"} disabled:opacity-50`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${food.is_available ? "left-6" : "left-1"}`} /></button><button onClick={() => setModal({ type: "food", food })} aria-label={`Edit ${food.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-stone-100"><Pencil size={15} /></button><button onClick={() => setDeleteTarget({ type: "food", item: food })} disabled={busyId === food.id} aria-label={`Delete ${food.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div>
            <FoodExtras food={food} onChanged={loadMenu} />
          </article>)}</div>
        </section>)}</div>}
      </div>
    </section>}
  </div>
  {modal && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section role="dialog" aria-modal="true" aria-labelledby="menu-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><header className="mb-5 flex items-start justify-between"><div><h3 id="menu-form-title" className="text-lg font-bold text-ink">{modal.type === "category" ? modal.category ? "Edit category" : "Add a category" : modal.food ? "Edit dish" : "Add a dish"}</h3><p className="mt-1 text-xs text-stone-500">{modal.type === "category" ? "Organize dishes into menu sections." : "Add or update a dish in this category."}</p></div><button onClick={() => setModal(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-stone-100"><X size={18} /></button></header>{modal.type === "category" ? <CategoryForm key={modal.category?.id ?? "category-new"} category={modal.category} onCancel={() => setModal(null)} onSaved={async () => { setModal(null); await loadMenu(); }} /> : <FoodForm key={modal.food?.id ?? `food-new-${modal.category_id ?? ""}`} food={modal.food} categories={categories} initialCategoryId={modal.category_id} onCancel={() => setModal(null)} onSaved={async () => { setModal(null); await loadMenu(); }} />}</section></div>}
  {deleteTarget && <ConfirmActionDialog action="delete" resourceType={deleteTarget.type === "category" ? "category" : "dish"} resourceName={deleteTarget.item.name} title={`Move this ${deleteTarget.type === "category" ? "category" : "dish"} to deleted items?`} description={<>{deleteTarget.type === "category" && deleteTarget.item.foods.length > 0 ? `This also moves ${deleteTarget.item.foods.length} dish${deleteTarget.item.foods.length === 1 ? "" : "es"} ` : ""}<strong>{deleteTarget.item.name}</strong> out of the active menu. Existing records are preserved.</>} confirmLabel="Move to deleted items" busy={busyId === deleteTarget.item.id} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget.type === "category" ? deleteCategory(deleteTarget.item) : deleteFood(deleteTarget.item)} />}
  </ManagerLayout>;
}
