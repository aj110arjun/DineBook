import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmAction, getPendingConfirm, settleConfirm, subscribeToConfirm } from "./confirmDialog.js";

test("confirmations wait for a user choice and process requests in order", async () => {
  let notifications = 0;
  const unsubscribe = subscribeToConfirm(() => notifications++);
  const first = confirmAction("Remove exception?");
  const firstRequest = getPendingConfirm();
  const second = confirmAction("Apply schedule?");
  assert.equal(getPendingConfirm(), firstRequest);
  settleConfirm(firstRequest, false);
  assert.equal(await first, false);
  const secondRequest = getPendingConfirm();
  assert.equal(secondRequest.message, "Apply schedule?");
  settleConfirm(firstRequest, true);
  assert.equal(getPendingConfirm(), secondRequest);
  settleConfirm(secondRequest, true);
  assert.equal(await second, true);
  assert.equal(getPendingConfirm(), null);
  assert.equal(notifications, 4);
  unsubscribe();
});
