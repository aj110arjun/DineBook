import axios from "axios";
import { API_BASE } from "./authApi.js";

export const LEDGER_FORMATS = [["pdf", "PDF"], ["xlsx", "Excel"], ["csv", "CSV"]];
const MIME = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv" };
const LEDGERS = {
  manager: { path: "/api/manager/ledger/export", filename: "restaurant-ledger", label: "restaurant ledger" },
  admin: { path: "/api/admin/ledger/export", filename: "platform-ledger", label: "platform ledger" },
};

export function formatLedgerPeriod(period) {
  const date = (value) => value.split("-").reverse().join("/");
  return `${date(period.start_date)} to ${date(period.end_date)}`;
}

export function ledgerError(reason, scope = "manager") {
  if (reason.status === 401) return "Your session has expired. Please sign in again.";
  if (reason.status === 403) return `You no longer have access to this ${LEDGERS[scope].label}.`;
  if (reason.status === 422) return reason.message || "Choose a shorter or valid date range.";
  return `The ${LEDGERS[scope].label} is unavailable. Please try again.`;
}

export async function fetchLedgerExport(period, format, signal, scope = "manager") {
  const ledger = LEDGERS[scope];
  if (!ledger) throw new Error("Choose a supported ledger.");
  if (!MIME[format]) throw new Error("Choose PDF, Excel or CSV.");
  const query = new URLSearchParams({ start_date: period.start_date, end_date: period.end_date, format });
  const response = await axios.request({ url: `${API_BASE}${ledger.path}?${query}`, method: "GET",
    withCredentials: true, responseType: "blob", timeout: 60000, signal, validateStatus: () => true });
  if (response.status < 200 || response.status >= 300) {
    let detail;
    try { detail = JSON.parse(await response.data.text()).detail; } catch { /* Use the safe fallback below. */ }
    throw Object.assign(new Error(typeof detail === "string" ? detail : "Unable to export the ledger."), { status: response.status });
  }
  if (!(response.data instanceof Blob) || !String(response.headers["content-type"] || response.data.type).includes(MIME[format])) {
    throw new Error("The server returned an unexpected export.");
  }
  return { blob: response.data, filename: `${ledger.filename}_${period.start_date}_${period.end_date}.${format}` };
}

export async function downloadLedger(period, format, signal, scope = "manager") {
  const { blob, filename } = await fetchLedgerExport(period, format, signal, scope);
  if (signal?.aborted) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

