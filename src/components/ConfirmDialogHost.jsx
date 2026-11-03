import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import ConfirmActionDialog from "./ConfirmActionDialog.jsx";
import { getPendingConfirm, settleConfirm, subscribeToConfirm } from "../lib/confirmDialog.js";

export default function ConfirmDialogHost() {
  const request = useSyncExternalStore(subscribeToConfirm, getPendingConfirm);
  if (!request) return null;
  return createPortal(
    <ConfirmActionDialog
      key={request.message}
      action="confirm"
      title="Confirm action"
      description={<span style={{ whiteSpace: "pre-line" }}>{request.message}</span>}
      confirmLabel="Confirm"
      onConfirm={() => settleConfirm(request, true)}
      onCancel={() => settleConfirm(request, false)}
    />,
    document.body,
  );
}
