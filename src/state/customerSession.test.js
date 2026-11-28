import test from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import customerSession, {
  clearCustomerSession,
  refreshCustomerSession,
  setCustomerSession,
} from "./customerSession.js";

test("customer identity updates propagate to shared subscribers and logout clears them", () => {
  const store = configureStore({ reducer: { customerSession } });
  const seen = [];
  const unsubscribe = store.subscribe(() =>
    seen.push(store.getState().customerSession.user),
  );
  store.dispatch(
    setCustomerSession({ id: "customer", name: "Original", avatar_url: null }),
  );
  const updated = {
    id: "customer",
    name: "Updated",
    avatar_url: "https://example.com/avatar",
  };
  store.dispatch(refreshCustomerSession(updated));
  assert.equal(store.getState().customerSession.user, updated);
  store.dispatch(clearCustomerSession());
  assert.deepEqual(seen, [
    { id: "customer", name: "Original", avatar_url: null },
    updated,
    null,
  ]);
  unsubscribe();
});

test("a late profile save cannot restore a signed-out or different account", () => {
  const store = configureStore({ reducer: { customerSession } });
  const stale = { id: "previous-customer", name: "Saved name" };
  store.dispatch(refreshCustomerSession(stale));
  assert.equal(store.getState().customerSession.user, null);
  const current = { id: "current-customer", name: "Current account" };
  store.dispatch(setCustomerSession(current));
  store.dispatch(refreshCustomerSession(stale));
  assert.equal(store.getState().customerSession.user, current);
});
