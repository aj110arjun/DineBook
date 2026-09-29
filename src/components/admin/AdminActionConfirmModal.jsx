import { AlertTriangle, X } from "lucide-react";

export default function AdminActionConfirmModal({
  action,
  subject = "this manager application",
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!action) return null;

  const approving = action === "approve";
  const actionLabel = approving ? "Approve" : "Reject";

  return (
    <div className="admin-confirm-backdrop" role="presentation">
      <section className="admin-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description">
        <button type="button" className="admin-confirm-close" onClick={onCancel} disabled={busy} aria-label="Close confirmation">
          <X size={18} />
        </button>
        <div className={`admin-confirm-icon ${approving ? "approve" : "reject"}`}>
          <AlertTriangle size={21} />
        </div>
        <h2 id="admin-confirm-title">{actionLabel} manager application?</h2>
        <p id="admin-confirm-description">
          {approving
            ? `This will approve ${subject} and allow the manager to access the platform.`
            : `This will reject ${subject}. The manager will not be able to access the platform.`}
        </p>
        <div className="admin-confirm-actions">
          <button type="button" className="admin-confirm-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`admin-confirm-submit ${approving ? "approve" : "reject"}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : `${actionLabel} Application`}
          </button>
        </div>
      </section>
    </div>
  );
}
