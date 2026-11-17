import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { downloadLedger, formatLedgerPeriod, LEDGER_FORMATS, ledgerError } from "../../lib/managerLedger.js";
import "../../assets/css/ManagerLedgerDownloads.css";

export default function ManagerLedgerDownloads({ period, disabled = false, scope = "manager" }) {
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const request = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  async function exportReport(format) {
    if (request.current || disabled) return;
    const controller = new AbortController();
    request.current = controller;
    setExporting(format);
    setError("");
    try {
      await downloadLedger(period, format, controller.signal, scope);
    } catch (reason) {
      if (mounted.current && !controller.signal.aborted) setError(ledgerError(reason, scope));
    } finally {
      if (request.current === controller) request.current = null;
      if (mounted.current) setExporting("");
    }
  }

  return <div className="manager-ledger-downloads" role="group" aria-label={`${scope === "admin" ? "Platform" : "Restaurant"} ledger downloads`} aria-busy={Boolean(exporting)}>
    <span className="manager-ledger-downloads-label">Download ledger</span>
    <div className="manager-ledger-downloads-actions">
      {LEDGER_FORMATS.map(([format, label]) => {
        const Icon = format === "xlsx" ? FileSpreadsheet : format === "pdf" ? FileText : Download;
        return <button key={format} type="button" onClick={() => exportReport(format)}
          disabled={disabled || Boolean(exporting)} aria-label={`Download ${scope === "admin" ? "platform" : "restaurant"} ledger as ${label}`}
          title={`All ledger entries: ${formatLedgerPeriod(period)} (IST)`}>
          <Icon size={15} aria-hidden="true" />{exporting === format ? "Preparing…" : label}
        </button>;
      })}
    </div>
    {error && <p className="manager-ledger-downloads-error" role="alert">{error}</p>}
    {exporting && <span className="ux-sr-only" role="status">Preparing the {exporting.toUpperCase()} ledger download.</span>}
  </div>;
}
