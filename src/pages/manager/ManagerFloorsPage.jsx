import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusCircle, ChevronDown, MapPin, X, Pencil, Trash2 } from "lucide-react";
import { requestJson } from "../../lib/authApi.js";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";

const statusLabels = { available: "Available", reserved: "Reserved", occupied: "Occupied", maintenance: "Maintenance" };

export default function ManagerFloorsPage() {
  const [floors, setFloors] = useState([]);
  const [floorFilter, setFloorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState("");
  const [name, setName] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [description, setDescription] = useState("");
  const [floorId, setFloorId] = useState("");
  const [number, setNumber] = useState("");
  const [seats, setSeats] = useState("2");
  const [shape, setShape] = useState("round");
  const [tableStatus, setTableStatus] = useState("available");
  const [editingTable, setEditingTable] = useState(null);
  const [editingFloor, setEditingFloor] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => requestJson("/api/manager/floors").then(data => { setFloors(data); setFloorId(current => current || data[0]?.id || ""); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const allTables = useMemo(() => floors.flatMap(floor => floor.tables.map(table => ({ ...table, floorId: floor.id, floorName: floor.floor_name || floor.name }))), [floors]);
  const scopedTables = allTables.filter(table => floorFilter === "all" || table.floorId === floorFilter);
  const counts = scopedTables.reduce((result, table) => { result[table.status] = (result[table.status] || 0) + 1; return result; }, {});
  const shownFloors = floors.filter(floor => floorFilter === "all" || floor.id === floorFilter);

  async function addFloor(event) {
    event.preventDefault(); setError("");
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) { setError("Enter a floor or zone name."); return; }
    setSaving(true);
    try {
      const payload = { floor_number: Number(floorNumber), floor_name: cleanName, description: description.trim() || null };
      const created = editingFloor
        ? await requestJson(`/api/manager/floors/${editingFloor.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await requestJson("/api/manager/floors", { method: "POST", body: JSON.stringify(payload) });
      setFloors(current => {
        const next = editingFloor
          ? current.map(floor => floor.id === created.id ? { ...created, tables: floor.tables } : floor)
          : [...current, { ...created, tables: [] }];
        return next.sort((a, b) => a.floor_number - b.floor_number);
      });
      setName(""); setDescription(""); setFloorNumber(""); setEditingFloor(null); setForm(""); setFloorFilter(created.id); setFloorId(created.id);
      setNotice(editingFloor ? "Floor updated." : "Floor created successfully.");
      window.setTimeout(() => setNotice(""), 3500);
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function addTable(event) {
    event.preventDefault(); setError("");
    setSaving(true);
    try {
      const payload = { floor_id: floorId, table_number: number.trim(), capacity: Number(seats), table_type: shape, status: tableStatus };
      await requestJson(editingTable ? `/api/manager/tables/${editingTable.id}` : "/api/manager/tables", { method: editingTable ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setNumber(""); setEditingTable(null); setForm(""); await load();
    }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  function openAddTable() {
    setFloorId(floorFilter !== "all" ? floorFilter : floors[0]?.id || "");
    setNumber("");
    setSeats("4");
    setShape("round");
    setTableStatus("available");
    setEditingTable(null);
    setError("");
    setForm("table");
  }
  function openAddFloor() {
    setName("");
    setDescription("");
    setFloorNumber(String(Math.max(0, ...floors.map(floor => Number(floor.floor_number) || 0)) + 1));
    setEditingFloor(null);
    setError("");
    setForm("floor");
  }
  function openEditFloor(floor) {
    setName(floor.floor_name || floor.name);
    setFloorNumber(String(floor.floor_number));
    setDescription(floor.description || "");
    setEditingFloor(floor);
    setError(""); setForm("floor");
  }
  function openEditTable(table, floor) {
    setEditingTable({ ...table, floorId: floor.id });
    setFloorId(floor.id); setNumber(table.table_number); setSeats(String(table.capacity ?? table.seats));
    setShape(table.table_type || "round"); setTableStatus(table.status); setError(""); setForm("table");
  }
  async function removeTable() {
    if (!editingTable || !window.confirm(`Delete table ${editingTable.table_number}? This action cannot be undone.`)) return;
    setSaving(true);
    try { await requestJson(`/api/manager/tables/${editingTable.id}`, { method: "DELETE" }); setEditingTable(null); setForm(""); await load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function deactivateFloor(floor) {
    if (floor.tables.length) { setError("Move or delete the tables on this floor before deactivating it."); return; }
    if (!window.confirm(`Deactivate ${floor.floor_name || floor.name}?`)) return;
    try { await requestJson(`/api/manager/floors/${floor.id}`, { method: "DELETE" }); if (floorFilter === floor.id) setFloorFilter("all"); await load(); }
    catch (e) { setError(e.message); }
  }

  return <ManagerLayout title="Table Layout & Live Seating">
    <div className="manager-dashboard-content table-layout-page">
      <div className="manager-breadcrumb"><span>Home</span><span>/</span><span>Tables</span><span>/</span><strong>Layout & Live Seating</strong></div>
      {notice && <div className="table-layout-notice" role="status">{notice}</div>}
      {error && <div className="table-layout-error" role="alert">{error}</div>}
      <section className="table-stat-grid" aria-label="Table availability summary">
        {[{ key: "all", label: "Total Tables", value: scopedTables.length }, ...Object.entries(statusLabels).map(([key, label]) => ({ key, label: `${label} Tables`, value: counts[key] || 0 }))].map(stat => <button type="button" key={stat.key} onClick={() => setStatusFilter(stat.key)} className={`table-stat-card ${stat.key} ${statusFilter === stat.key ? "selected" : ""}`}><span>{stat.label}</span><strong>{stat.value}</strong></button>)}
      </section>
      <div className="table-layout-toolbar"><label className="table-layout-select"><span className="sr-only">Filter tables by status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All Tables</option>{Object.entries(statusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><ChevronDown size={15} /></label><label className="table-layout-select"><span className="sr-only">Choose floor</span><select value={floorFilter} onChange={e => setFloorFilter(e.target.value)}><option value="all">All Floors</option>{floors.map(floor => <option value={floor.id} key={floor.id}>{floor.name}</option>)}</select><ChevronDown size={15} /></label><button type="button" className="table-layout-primary" onClick={openAddTable} disabled={!floors.length}><PlusCircle size={17} /> Add Floor Table</button></div>

      {form === "floor" && <div className="table-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setForm(""); }}><form className="table-entry-modal" onSubmit={addFloor} aria-labelledby="add-floor-title"><button className="table-modal-close" type="button" aria-label="Close" onClick={() => !saving && setForm("")}><X size={20} /></button><h2 id="add-floor-title">{editingFloor ? "Edit Floor" : "Add Floor"}</h2><p>Set up a numbered floor or dining zone for your tables.</p><label>Floor Number <b>*</b><input autoFocus type="number" min="1" step="1" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} required /></label><label>Floor / Zone Name <b>*</b><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Indoor Dining Hall" required maxLength={100} /></label><label>Description<input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes about this floor" maxLength={1000} /></label>{error && <div className="table-layout-error" role="alert">{error}</div>}<footer><button type="button" className="table-modal-secondary" onClick={() => setForm("")} disabled={saving}>Cancel</button><button className="table-layout-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingFloor ? "Save Changes" : "Save Floor"}</button></footer></form></div>}

      {form === "table" && <div className="table-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setForm(""); }}><div className="table-entry-modal table-entry-modal-wide" role="dialog" aria-modal="true" aria-labelledby="add-table-title"><button className="table-modal-close" type="button" aria-label="Close" onClick={() => setForm("")}><X size={20} /></button><div className="table-modal-breadcrumb">Home&nbsp; / &nbsp;Tables&nbsp; / &nbsp;<strong>{editingTable ? "Edit Table" : "Add Table"}</strong></div><div className="table-entry-grid"><form className="table-spec-form" onSubmit={addTable}><h2 id="add-table-title">Table Specifications</h2><label>Table Name / Number <b>*</b><input autoFocus value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. T-12" required maxLength={30} /></label><label>Table Type <b>*</b><select value={shape} onChange={e => setShape(e.target.value)}><option value="round">Round</option><option value="square">Square</option><option value="rectangle">Rectangle</option></select></label><label>Seating Capacity <b>*</b><input type="number" min="1" max="50" value={seats} onChange={e => setSeats(e.target.value)} required /></label><label>Floor / Zone <b>*</b><select value={floorId} onChange={e => setFloorId(e.target.value)} required>{floors.map(floor => <option key={floor.id} value={floor.id}>{floor.floor_name || floor.name}</option>)}</select></label><label>Table Status <b>*</b><select value={tableStatus} onChange={e => setTableStatus(e.target.value)}>{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{error && <div className="table-layout-error" role="alert">{error}</div>}<footer>{editingTable && <button type="button" className="table-delete-button" onClick={removeTable} disabled={saving}><Trash2 size={15}/> Delete Table</button>}<button type="button" className="table-modal-secondary" onClick={() => setForm("")}>Cancel</button><button className="table-layout-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingTable ? "Save Changes" : "Save Table"}</button></footer></form><section className="table-preview-card"><h2>Visual Layout Preview</h2><div className="table-preview-canvas"><small>LIVE SHAPE RENDERING</small><div className={`table-preview-shape ${shape} ${tableStatus}`}><strong>{number ? number.toUpperCase().startsWith("T-") ? number : `T-${number}` : "T-#"}</strong><span>{seats} {Number(seats) === 1 ? "Seat" : "Seats"}</span><em>{statusLabels[tableStatus]}</em></div><p>Rendered scale based on standard dining parameters</p></div><strong className="table-preview-guide">Status Key Guide</strong><div className="table-layout-legend"><span><i className="available" />Available</span><span><i className="reserved" />Reserved</span><span><i className="occupied" />Occupied</span><span><i className="maintenance" />Maintenance</span></div></section></div></div></div>}

      <div className="table-layout-columns">
        <section className="table-layout-card"><h2><MapPin size={17} /> Live Floor Map</h2>
          {shownFloors.map(floor => { const tables = floor.tables.filter(table => (statusFilter === "all" || table.status === statusFilter)); return <div className="live-floor" key={floor.id}><h3>{floor.floor_name || floor.name}</h3>{tables.length ? <div className="live-floor-map">{tables.map((table, index) => <button type="button" title="Edit table" onClick={() => openEditTable(table, floor)} className={`live-table ${table.status} ${table.table_type || (index % 4 === 0 ? "round" : index % 4 === 1 ? "square" : "rectangle")}`} key={table.id}><strong>{table.table_number.toUpperCase().startsWith("T-") ? table.table_number : `T-${table.table_number}`}</strong><span>{table.capacity ?? table.seats} {(table.capacity ?? table.seats) === 1 ? "Seat" : "Seats"}</span><small>{statusLabels[table.status]}</small></button>)}</div> : <p className="table-layout-empty">No tables match this view.</p>}</div>; })}
          {floors.length === 0 && <div className="table-layout-empty"><p>No floors yet. Add a floor to start mapping tables.</p><button type="button" onClick={() => setForm("floor")}>Add your first floor</button></div>}
          <div className="table-layout-legend">{Object.entries(statusLabels).map(([key, label]) => <span key={key}><i className={key} />{label} ({counts[key] || 0})</span>)}</div>
        </section>
        <section className="table-layout-card floor-selection"><header><h2>Floor Selection</h2><button className="table-layout-primary" type="button" onClick={openAddFloor}><PlusCircle size={16} /> Add Floor</button></header>
          {floors.map(floor => { const free = floor.tables.filter(table => table.status === "available").length; return <div className={`floor-selection-row ${floorFilter === floor.id ? "active" : ""}`} key={floor.id}><button type="button" className="floor-selection-main" onClick={() => setFloorFilter(floor.id)}><strong>{floor.floor_number}. {floor.floor_name || floor.name}</strong><span className={free ? "available" : "maintenance"}>{free ? `${free} Available` : "No Availability"}</span><small>{floor.tables.length} tables</small></button><div className="floor-row-actions"><button type="button" aria-label={`Edit ${floor.floor_name || floor.name}`} title="Edit floor" onClick={() => openEditFloor(floor)}><Pencil size={14}/></button><button type="button" aria-label={`Deactivate ${floor.floor_name || floor.name}`} title="Deactivate floor" onClick={() => deactivateFloor(floor)}><Trash2 size={14}/></button></div></div>; })}
          {floors.length === 0 && <p className="table-layout-empty">Your floors will appear here.</p>}
        </section>
      </div>
    </div>
  </ManagerLayout>;
}
