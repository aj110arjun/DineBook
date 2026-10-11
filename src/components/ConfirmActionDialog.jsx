import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, RotateCcw, ShieldAlert, Trash2, XCircle } from "lucide-react";

const actionDefaults = {
  delete: { title: "Delete this item?", button: "Delete", icon: Trash2, tone: "danger", explanation: "This item will be moved out of active use. Related history will be preserved." },
  remove: { title: "Remove this image?", button: "Remove image", icon: Trash2, tone: "danger", explanation: "This image will be removed from the item." },
  deactivate: { title: "Deactivate this item?", button: "Deactivate", icon: Ban, tone: "danger", explanation: "This item will no longer be available in active workflows." },
  suspend: { title: "Suspend this account?", button: "Suspend", icon: ShieldAlert, tone: "danger", explanation: "Access will be restricted according to the existing suspension rules." },
  resume: { title: "Resume this account?", button: "Resume", icon: RotateCcw, tone: "success", explanation: "Access will be restored according to the existing account rules." },
  approve: { title: "Approve this request?", button: "Approve", icon: CheckCircle2, tone: "success", explanation: "This request will be approved using the existing approval workflow." },
  reject: { title: "Reject this request?", button: "Reject", icon: XCircle, tone: "danger", explanation: "This request will be rejected using the existing review workflow." },
  cancel: { title: "Cancel this booking?", button: "Cancel booking", icon: XCircle, tone: "danger", explanation: "This booking will be cancelled according to the current cancellation and refund policy." },
};

export default function ConfirmActionDialog({
  action = "delete", resourceType = "item", resourceName, title, description,
  confirmLabel, cancelLabel = "Cancel", busy = false, requireReason = false,
  showReason = requireReason,
  reasonLabel = "Reason", reason = "", onReasonChange, onConfirm, onCancel,
}) {
  const config = actionDefaults[action] || actionDefaults.delete;
  const Icon = config.icon;
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const previousFocus = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const isBusy = busy || submitting;

  useEffect(() => {
    previousFocus.current = document.activeElement;
    confirmRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape" && !isBusy) onCancelRef.current?.();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button:not(:disabled), textarea:not(:disabled), input:not(:disabled)");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [isBusy]);

  async function confirm() {
    if (isBusy || (requireReason && !reason.trim())) return;
    setSubmitting(true);
    try { await onConfirm?.(reason.trim()); }
    finally { setSubmitting(false); }
  }

  return <div className="action-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isBusy) onCancel?.(); }}>
    <section ref={dialogRef} className="action-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="action-confirm-title" aria-describedby="action-confirm-description">
      <div className={`action-confirm-icon ${config.tone}`}><Icon size={20} /></div>
      <h2 id="action-confirm-title">{title || config.title.replace(/this (item|request|account|booking)/, `this ${resourceType}`)}</h2>
      <p id="action-confirm-description">{description || <>{config.explanation} {resourceName && <><br /><strong>{resourceName}</strong></>}</>}</p>
      {showReason && <label className="action-confirm-reason">{reasonLabel}<textarea value={reason} onChange={(event) => onReasonChange?.(event.target.value)} maxLength={500} required={requireReason} /></label>}
      <div className="action-confirm-actions">
        <button type="button" className="action-confirm-cancel" onClick={onCancel} disabled={isBusy}>{cancelLabel}</button>
        <button ref={confirmRef} type="button" className={`action-confirm-submit ${config.tone}`} onClick={confirm} disabled={isBusy || (requireReason && !reason.trim())}>{isBusy ? "Processing…" : confirmLabel || config.button}</button>
      </div>
    </section>
  </div>;
}
