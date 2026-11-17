import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let ZoneGroups, Picker, temporary;
const floor = { id: "floor", floor_name: "Ground Floor", zones: [
  { id: "window", floor_id: "floor", name: "Window Seats" }, { id: "terrace", floor_id: "floor", name: "Terrace" },
] };
const tables = [
  { id: "one", floor_id: "floor", floor_name: "Ground Floor", zone_id: "window", zone_name: "Window Seats", table_number: "T-1", capacity: 4, reservation_fee: 250, status: "available", table_type: "round", grid_row: 0, grid_col: 0 },
  { id: "two", floor_id: "floor", floor_name: "Ground Floor", zone_id: null, zone_name: null, table_number: "T-2", capacity: 2, reservation_fee: 100, status: "available", table_type: "square", grid_row: 0, grid_col: 1 },
];
before(async () => {
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.floor-zones-render-"));
  for (const entry of ["src/components/manager/ManagerFloorZones.jsx", "src/components/TableFloorPicker.jsx"]) {
    const output = await build({ logLevel: "silent", build: { ssr: entry, write: false } });
    for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  }
  ZoneGroups = (await import(pathToFileURL(join(temporary, "ManagerFloorZones.js")))).default;
  Picker = (await import(pathToFileURL(join(temporary, "TableFloorPicker.js")))).default;
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const renderGroups = (props = {}) => renderToStaticMarkup(createElement(ZoneGroups, { floor, tables, ...props }));

test("manager floor groups named zones and general seating without hiding unassigned tables", () => {
  const html = renderGroups();
  for (const name of ["Ground Floor", "Window Seats", "Terrace", "General seating", "T-1", "T-2", "Add Zone"]) assert.ok(html.includes(name), name);
  assert.equal((html.match(/title="Edit table"/g) || []).length, 2);
  assert.match(html, /No tables match this zone/);
  assert.match(html, /aria-label="Edit Window Seats zone"/);
  assert.match(html, /aria-label="Delete Terrace zone"/);
});

test("zone filters isolate named zones and general seating", () => {
  const window = renderGroups({ zoneFilter: "window", tables: [tables[0]] });
  assert.match(window, /T-1/);
  assert.doesNotMatch(window, /T-2|General seating|Terrace/);
  const general = renderGroups({ zoneFilter: "general", tables: [tables[1]] });
  assert.match(general, /General seating/);
  assert.match(general, /T-2/);
  assert.doesNotMatch(general, /T-1|Window Seats|Terrace/);
});

test("floors without zones preserve their existing table list", () => {
  const html = renderGroups({ floor: { ...floor, zones: [] }, tables: [tables[1]] });
  assert.match(html, /General seating/);
  assert.match(html, /T-2/);
  assert.doesNotMatch(html, /Edit .* zone/);
});

test("booking picker exposes zone names while keeping the full selected capacity", () => {
  const html = renderToStaticMarkup(createElement(Picker, { tables, selectedIds: ["one", "two"], guests: 6, onChange() {} }));
  assert.match(html, /aria-label="Floor zones"/);
  assert.match(html, /All zones/);
  assert.match(html, /Window Seats/);
  assert.match(html, /General seating/);
  assert.match(html, /Table T-1, Window Seats, 4 seats/);
  assert.match(html, /2 tables · 6\/6 seats/);
  assert.match(html, /Enough seats selected for 6 guests/);
});
