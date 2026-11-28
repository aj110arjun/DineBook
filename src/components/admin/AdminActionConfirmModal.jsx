import ConfirmActionDialog from "../ConfirmActionDialog.jsx";

export default function AdminActionConfirmModal({
  action,
  subject = "manager application",
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!action) return null;
  const approving = action === "approve";
  return (
    <ConfirmActionDialog
      action={action}
      resourceType="restaurant request"
      resourceName={subject}
      title={
        approving
          ? "Approve restaurant request?"
          : "Reject restaurant request?"
      }
      description={
        approving
          ? `Confirm approval for ${subject}. The manager will be able to access the platform.`
          : `Confirm rejection for ${subject}. The manager will not be able to access the platform.`
      }
      confirmLabel={approving ? "Confirm Approval" : "Confirm Rejection"}
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
