import { useState } from "react";
import "../assets/css/TableFloorPicker.css";
import { displayTableLayout, hasTablePosition } from "../lib/tableFloorLayout.js";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

export default function TableFloorPicker({
  tables,
  selectedIds,
  onChange,
  guests,
}) {
  const [activeFloor, setActiveFloor] = useState(null);
  const [notice, setNotice] = useState("");

  const floors = Array.from(
    new Map(tables.map((table) => [table.floor_id, table.floor_name])),
  );

  const floorId = floors.some(([id]) => id === activeFloor)
    ? activeFloor
    : floors[0]?.[0];

  const floorTables = tables.filter((table) => table.floor_id === floorId);

  const displayTables = displayTableLayout(floorTables);
  const hasAutomaticLayout = floorTables.some((table) => table.layout_source === "automatic");
  const hasUnpositionedTables = floorTables.some((table) => !hasTablePosition(table));

  const selected = tables.filter((table) => selectedIds.includes(table.id));
  const seats = selected.reduce((sum, table) => sum + table.capacity, 0);
  const total =
    selected.reduce(
      (sum, table) => sum + Math.round(Number(table.reservation_fee) * 100),
      0,
    ) / 100;

  const minRow = Math.min(
    ...displayTables.map((table) => table.displayRow),
    0,
  );
  const minCol = Math.min(
    ...displayTables.map((table) => table.displayCol),
    0,
  );
  const columns = Math.max(
    1,
    ...displayTables.map((table) => table.displayCol - minCol + 1),
  );

  function toggle(table) {
    if (table.status !== "available") return;

    if (!selectedIds.includes(table.id) && seats >= Number(guests)) {
      setNotice(
        `Your selected tables already have enough seats for ${guests} guests. Remove a table first to change your selection.`,
      );
      return;
    }

    const nextIds = selectedIds.includes(table.id)
      ? selectedIds.filter((id) => id !== table.id)
      : [...selectedIds, table.id];

    setNotice("");
    onChange(nextIds);
  }

  return (
    <section className="floor-picker">
      <header className="floor-picker__header">
        <div>
          <h2>Select your tables</h2>
          <p>Choose available tables for {guests} guests.</p>
        </div>
        <div>
          <span>{selected.length} table{selected.length === 1 ? "" : "s"} · {seats}/{guests} seats</span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="floor-picker__clear"
              onClick={() => {
                setNotice("");
                onChange([]);
              }}
            >
              Clear selection
            </button>
          )}
        </div>
      </header>

      <div className="floor-picker__floors" aria-label="Restaurant floors">
        {floors.map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={floorId === id}
            onClick={() => {
              setActiveFloor(id);
              setNotice("");
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="floor-picker__viewport">
        <div
          className="floor-picker__map"
          role="group"
          aria-label={`${floors.find(([id]) => id === floorId)?.[1] || "Restaurant"} tables`}
          style={{ gridTemplateColumns: `repeat(${columns}, 110px)` }}
        >
          {displayTables.map((table) => {
            const isSelected = selectedIds.includes(table.id);
            const unavailable = table.status !== "available";

            return (
              <button
                key={table.id}
                type="button"
                disabled={unavailable}
                aria-pressed={isSelected}
                aria-label={`Table ${table.table_number}, ${table.capacity} seats, ${money(
                  table.reservation_fee,
                )}, ${unavailable ? "unavailable" : "available"}`}
                className={[
                  "floor-picker__table",
                  `floor-picker__table--${table.table_type}`,
                  isSelected ? "is-selected" : "",
                ].join(" ")}
                style={{
                  gridRow: table.displayRow - minRow + 1,
                  gridColumn: table.displayCol - minCol + 1,
                }}
                onClick={() => toggle(table)}
              >
                <strong>{table.table_number}</strong>
                <span>{table.capacity} seats</span>
                <small>{money(table.reservation_fee)}</small>
              </button>
            );
          })}
        </div>

        {!floorTables.length && (
          <p className="floor-picker__notice">
            No tables are available on this floor.
          </p>
        )}
      </div>

      {hasAutomaticLayout && (
        <p className="floor-picker__notice">
          Default table layout. Select available tables to combine their seats.
        </p>
      )}

      {hasUnpositionedTables && (
        <p className="floor-picker__notice">
          Tables without confirmed positions are shown in a default layout.
          Select any available tables to combine their seats.
        </p>
      )}

      <div className="floor-picker__legend">
        <span>
          <i className="available" /> Available
        </span>
        <span>
          <i className="selected" /> Selected
        </span>
        <span>
          <i className="unavailable" /> Unavailable
        </span>
      </div>

      <div className="floor-picker__summary" aria-live="polite">
        <div>
          <strong>
            {selected.length
              ? selected.map((table) => table.table_number).join(" + ")
              : "No tables selected"}
          </strong>
          <p>
            {seats} seats · {guests} guests
          </p>
        </div>
        <strong>{money(total)}</strong>
      </div>

      {notice && (
        <p className="floor-picker__notice" role="alert">
          {notice}
        </p>
      )}

      {selected.length > 0 && seats < Number(guests) && (
        <p className="floor-picker__notice" role="alert">
          Select more tables to seat all {guests} guests.
          {" "}{Number(guests) - seats} more seats needed.
        </p>
      )}
      {selected.length > 0 && seats >= Number(guests) && (
        <p className="ux-capacity-complete" role="status">
          Enough seats selected for {guests} guests. Continue to checkout.
        </p>
      )}
    </section>
  );
}
