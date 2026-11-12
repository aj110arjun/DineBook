import test from "node:test";
import assert from "node:assert/strict";
import { configureStore } from "@reduxjs/toolkit";
import pages, { closePage, openPage, updatePageField } from "./pages.js";

test("page instances keep independent state and discard it when closed", () => {
  const store = configureStore({ reducer: { pages } });
  const first = "OrdersPage/first";
  const second = "OrdersPage/second";
  store.dispatch(openPage({ scope: first, values: { page: 1 } }));
  store.dispatch(openPage({ scope: second, values: { page: 1 } }));

  store.dispatch(updatePageField({ scope: first, field: "page", value: 2 }));
  assert.equal(store.getState().pages[first].page, 2);
  assert.equal(store.getState().pages[second].page, 1);

  store.dispatch(closePage(first));
  store.dispatch(updatePageField({ scope: first, field: "page", value: 3 }));
  assert.equal(store.getState().pages[first], undefined);
  assert.equal(store.getState().pages[second].page, 1);
});
