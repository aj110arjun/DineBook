import { createSlice } from "@reduxjs/toolkit";

const notificationToasts = createSlice({
  name: "notificationToasts",
  initialState: {},
  reducers: {
    enqueueToast(state, { payload: { scope, item } }) {
      (state[scope] ??= []).push(item);
    },
    dismissToast(state, { payload: { scope, id } }) {
      const queue = state[scope];
      if (queue) state[scope] = queue.filter((item) => item.id !== id);
    },
    clearToasts(state, { payload: scope }) {
      delete state[scope];
    },
  },
});

export const { enqueueToast, dismissToast, clearToasts } =
  notificationToasts.actions;
export default notificationToasts.reducer;
