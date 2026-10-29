import { Download } from "lucide-react";
import {
  createTransactionInvoicePdf,
  transactionInvoiceFilename,
} from "../lib/transactionInvoicePdf.js";
import "./TransactionInvoice.css";

export function downloadTransactionInvoice(invoice) {
  const url = URL.createObjectURL(createTransactionInvoicePdf(invoice));
  const link = document.createElement("a");
  link.href = url;
  link.download = transactionInvoiceFilename(invoice);
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TransactionInvoiceButton({ invoice, className = "" }) {
  const status = String(invoice?.status || "").toUpperCase();
  const label =
    invoice?.category === "refund" ||
    invoice?.category === "wallet" ||
    invoice?.category === "wallet_top_up"
      ? "Download receipt"
      : ["PENDING", "FAILED"].includes(status)
        ? "Download summary"
        : "Download invoice";
  return (
    <button
      type="button"
      className={`transaction-invoice-button ${className}`.trim()}
      onClick={() => downloadTransactionInvoice(invoice)}
    >
      <Download size={16} aria-hidden="true" /> {label}
    </button>
  );
}
