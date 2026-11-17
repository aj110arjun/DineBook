import { Pencil, PlusCircle, Trash2 } from "lucide-react";

const labels = { available: "Available", reserved: "Reserved", occupied: "Occupied", maintenance: "Maintenance", inactive: "Inactive" };

export default function ManagerFloorZones({ floor, tables, zoneFilter = "all", onAddZone, onEditZone, onDeleteZone, onEditTable }) {
  const zones = (floor.zones || []).filter((zone) => zoneFilter === "all" || zoneFilter === zone.id);
  const groups = zones.map((zone) => ({ ...zone, tables: tables.filter((table) => table.zone_id === zone.id) }));
  const general = tables.filter((table) => !table.zone_id);
  if ((zoneFilter === "all" && (general.length || !floor.zones?.length)) || zoneFilter === "general") {
    groups.push({ id: "general", name: "General seating", tables: general });
  }
  return <>
    <header className="floor-zones-heading"><h3>{floor.floor_name || floor.name}</h3>
      <button type="button" onClick={() => onAddZone(floor)}><PlusCircle size={15} />Add Zone</button>
    </header>
    {groups.map((group) => <section className="floor-zone-group" key={group.id} aria-label={`${floor.floor_name || floor.name} · ${group.name}`}>
      <header><div><h4>{group.name}</h4><small>{group.tables.length} {group.tables.length === 1 ? "table" : "tables"}</small></div>
        {group.id !== "general" && <div className="floor-zone-actions">
          <button type="button" title="Edit zone" aria-label={`Edit ${group.name} zone`} onClick={() => onEditZone(floor, group)}><Pencil size={14} /></button>
          <button type="button" title="Delete zone" aria-label={`Delete ${group.name} zone`} onClick={() => onDeleteZone(group)}><Trash2 size={14} /></button>
        </div>}
      </header>
      {group.tables.length ? <div className="floor-zone-tables">{group.tables.map((table) => <button
        type="button" title="Edit table" onClick={() => onEditTable(table, floor)}
        className={`floor-zone-table ${table.status} ${table.table_type || "round"}`} key={table.id}>
        <strong>{table.table_number.toUpperCase().startsWith("T-") ? table.table_number : `T-${table.table_number}`}</strong>
        <span>{table.capacity ?? table.seats} {(table.capacity ?? table.seats) === 1 ? "Seat" : "Seats"}</span>
        <small>{labels[table.status]}</small>
      </button>)}</div> : <p className="floor-zone-empty">No tables match this zone. Assign a zone when adding or editing a table.</p>}
    </section>)}
    {!groups.length && <p className="table-layout-empty">No tables match this view.</p>}
  </>;
}
