import { configureStore } from "@reduxjs/toolkit";
import { notificationsApi } from "./notificationsApi.js";
import notificationToasts from "./notificationToasts.js";
import pages from "./pages.js";
import customerSession from "./customerSession.js";

export const store = configureStore({
  reducer: {
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    notificationToasts,
    pages,
    customerSession,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(notificationsApi.middleware),
});
