import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ADMIN_PERIOD_PRESETS, MANAGER_PERIOD_PRESETS, presetPeriod } from "./managerDashboard.js";

const period = { start_date: "2026-10-15", end_date: "2026-11-13" };
let component, adminComponent, temporary, downloadLedger, fetchLedgerExport, ledgerError;
before(async () => {
  const output = await build({ logLevel: "silent", build: { ssr: "src/components/manager/ManagerLedgerDownloads.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.ledger-render-"));
  for (const chunk of output.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  component = await import(pathToFileURL(join(temporary, "ManagerLedgerDownloads.js")));
  const adminOutput = await build({ logLevel: "silent", build: { ssr: "src/components/admin/AdminLedgerDownloads.jsx", write: false } });
  for (const chunk of adminOutput.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  adminComponent = await import(pathToFileURL(join(temporary, "AdminLedgerDownloads.js")));
  const transport = await build({ logLevel: "silent", build: { ssr: "src/lib/managerLedger.js", write: false, rollupOptions: { output: { entryFileNames: "ledgerTransport.js" } } } });
  for (const chunk of transport.output) if (chunk.type === "chunk") await writeFile(join(temporary, chunk.fileName), chunk.code);
  ({ downloadLedger, fetchLedgerExport, ledgerError } = await import(pathToFileURL(join(temporary, "ledgerTransport.js"))));
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

test("manager ranges include the requested trailing periods and clamp leap/month ends", () => {
  assert.deepEqual(MANAGER_PERIOD_PRESETS.map(([, label]) => label), ["30 days", "90 days", "6 months", "1 year", "Custom"]);
  const now = new Date("2026-11-16T00:30:00Z");
  assert.deepEqual(presetPeriod("last90", now), { start_date: "2026-08-19", end_date: "2026-11-16" });
  assert.deepEqual(presetPeriod("last6months", now), { start_date: "2026-05-17", end_date: "2026-11-16" });
  assert.deepEqual(presetPeriod("lastyear", now), { start_date: "2025-11-17", end_date: "2026-11-16" });
  assert.deepEqual(presetPeriod("lastyear", new Date("2024-02-29T12:00:00Z")), { start_date: "2023-03-01", end_date: "2024-02-29" });
  assert.deepEqual(presetPeriod("last6months", new Date("2026-08-31T12:00:00Z")), { start_date: "2026-03-01", end_date: "2026-08-31" });
});

test("all export formats use the applied period, credentials and cancellation without pagination", async (t) => {
  const types = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv; charset=utf-8" };
  const signal = new AbortController().signal;
  const calls = [];
  t.mock.method(axios, "request", async (config) => {
    calls.push(config);
    const format = new URL(config.url, "http://test").searchParams.get("format");
    return { data: new Blob(["synthetic bytes"], { type: types[format] }), status: 200, headers: { "content-type": types[format] } };
  });
  for (const format of Object.keys(types)) {
    const result = await fetchLedgerExport(period, format, signal);
    assert.equal(result.filename, `restaurant-ledger_2026-10-15_2026-11-13.${format}`);
    const request = calls.at(-1), query = new URL(request.url, "http://test").searchParams;
    assert.equal(query.get("start_date"), period.start_date); assert.equal(query.get("end_date"), period.end_date);
    assert.equal(query.has("page"), false); assert.equal(query.has("page_size"), false);
    assert.equal(request.withCredentials, true); assert.equal(request.signal, signal);
    assert.equal(request.responseType, "blob"); assert.equal(request.timeout, 60000);
  }
});

test("failed or unexpected exports never turn JSON errors into downloaded files", async (t) => {
  const request = t.mock.method(axios, "request", async () => ({ status: 422, data: new Blob(['{"detail":"Choose a shorter range."}']), headers: {} }));
  await assert.rejects(fetchLedgerExport(period, "pdf"), (error) => error.status === 422 && error.message === "Choose a shorter range.");
  request.mock.mockImplementation(async () => ({ status: 200, data: new Blob(["{}"], { type: "application/json" }), headers: {} }));
  await assert.rejects(fetchLedgerExport(period, "xlsx"), /unexpected export/);
  await assert.rejects(fetchLedgerExport(period, "exe"), /PDF, Excel or CSV/);
});

test("an export completed after navigation does not start a download", async (t) => {
  const controller = new AbortController();
  t.mock.method(axios, "request", async () => { controller.abort(); return { status: 200, data: new Blob(["data"], { type: "text/csv" }), headers: {} }; });
  assert.equal(await downloadLedger(period, "csv", controller.signal), false);
});

test("compact ledger controls offer all formats for the applied period", () => {
  const html = renderToStaticMarkup(createElement(component.default, { period }));
  assert.match(html, /role="group" aria-label="Restaurant ledger downloads"/);
  for (const format of ["PDF", "Excel", "CSV"]) assert.ok(html.includes(`aria-label="Download restaurant ledger as ${format}"`));
  assert.match(html, /15\/10\/2026 to 13\/11\/2026/);
  assert.doesNotMatch(html, /FINANCIAL RECORDS|<section|<table|Refresh restaurant ledger/);
});

test("invalid or unapplied custom dates disable all ledger downloads", () => {
  const html = renderToStaticMarkup(createElement(component.default, { period, disabled: true }));
  assert.equal((html.match(/ disabled=""/g) || []).length, 3);
});

test("admin downloads use only the admin endpoint with platform filenames and all applied dates", async (t) => {
  const types = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv" };
  const calls = [], signal = new AbortController().signal;
  t.mock.method(axios, "request", async (config) => {
    calls.push(config);
    const format = new URL(config.url, "http://test").searchParams.get("format");
    return { data: new Blob(["synthetic bytes"], { type: types[format] }), status: 200, headers: { "content-type": types[format] } };
  });
  for (const format of Object.keys(types)) {
    const result = await fetchLedgerExport(period, format, signal, "admin");
    assert.equal(result.filename, `platform-ledger_${period.start_date}_${period.end_date}.${format}`);
    const request = calls.at(-1), url = new URL(request.url, "http://test");
    assert.equal(url.pathname, "/api/admin/ledger/export");
    assert.deepEqual(Object.fromEntries(url.searchParams), { ...period, format });
    assert.equal(request.withCredentials, true);
    assert.equal(request.signal, signal);
  }
  await assert.rejects(fetchLedgerExport(period, "csv", signal, "customer"), /supported ledger/);
});

test("admin controls expose platform downloads and disable unapplied dates", () => {
  for (const [key] of MANAGER_PERIOD_PRESETS) assert.ok(ADMIN_PERIOD_PRESETS.some(([value]) => value === key));
  const html = renderToStaticMarkup(createElement(adminComponent.default, { period }));
  assert.match(html, /role="group" aria-label="Platform ledger downloads"/);
  for (const format of ["PDF", "Excel", "CSV"]) assert.ok(html.includes(`aria-label="Download platform ledger as ${format}"`));
  assert.match(html, /15\/10\/2026 to 13\/11\/2026/);
  assert.doesNotMatch(html, /restaurant ledger/);
  const disabled = renderToStaticMarkup(createElement(adminComponent.default, { period, disabled: true }));
  assert.equal((disabled.match(/ disabled=""/g) || []).length, 3);
  assert.match(ledgerError({ status: 403 }, "admin"), /platform ledger/);
  assert.match(ledgerError({ status: 503 }, "admin"), /platform ledger/);
  assert.match(ledgerError({ status: 401 }, "admin"), /session has expired/);
});
