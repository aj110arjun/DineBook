import { createSlice } from "@reduxjs/toolkit";

const pages = createSlice({
  name: "pages",
  initialState: {},
  reducers: {
    openPage(state, { payload: { scope, values } }) {
      state[scope] = values;
    },
    updatePageField(state, { payload: { scope, field, value } }) {
      if (state[scope]) state[scope][field] = value;
    },
    closePage(state, { payload: scope }) {
      delete state[scope];
    },
  },
});

export const { openPage, updatePageField, closePage } = pages.actions;
export default pages.reducer;
