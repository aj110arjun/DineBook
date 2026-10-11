import ConfirmActionDialog from "../ConfirmActionDialog.jsx";

export default function AdminActionConfirmModal({ action, subject = "manager application", busy = false, onCancel, onConfirm }) {
  if (!action) return null;
  const approving = action === "approve";
  return <ConfirmActionDialog
    action={action}
    resourceType="manager application"
    resourceName={subject}
    title={approving ? "Approve manager application?" : "Reject manager application?"}
    description={approving
      ? `This will approve ${subject} and allow the manager to access the platform.`
      : `This will reject ${subject}. The manager will not be able to access the platform.`}
    confirmLabel={approving ? "Approve application" : "Reject application"}
    busy={busy}
    onCancel={onCancel}
    onConfirm={onConfirm}
  />;
}
