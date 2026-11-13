import { createSlice } from "@reduxjs/toolkit";

const customerSession = createSlice({
  name: "customerSession",
  initialState: { user: null },
  reducers: {
    setCustomerSession(state, { payload }) {
      state.user = payload;
    },
    refreshCustomerSession(state, { payload }) {
      // A late save must not restore a logged-out or different customer's session.
      if (state.user?.id === payload.id) state.user = payload;
    },
    clearCustomerSession(state) {
      state.user = null;
    },
  },
});

export const {
  setCustomerSession,
  refreshCustomerSession,
  clearCustomerSession,
} = customerSession.actions;
export default customerSession.reducer;
