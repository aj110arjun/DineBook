import { createApi } from "@reduxjs/toolkit/query/react";
import { requestJson } from "../lib/authApi.js";

const notificationsPath = "/api/notifications";
export const notificationTags = (scope) => [
  { type: "Notifications", id: scope },
];

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: async ({ path, method }, { signal }) => {
    try {
      return { data: await requestJson(path, { method, signal }) };
    } catch (error) {
      return { error: { message: error.message } };
    }
  },
  tagTypes: ["Notifications"],
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ unread }) => ({
        path: unread
          ? `${notificationsPath}?limit=8&unread=true`
          : `${notificationsPath}?limit=100`,
      }),
      providesTags: (_result, _error, { scope }) => notificationTags(scope),
    }),
    getUnreadCount: builder.query({
      query: () => ({ path: `${notificationsPath}/unread-count` }),
      providesTags: (_result, _error, scope) => notificationTags(scope),
    }),
    getNotification: builder.query({
      keepUnusedDataFor: 0,
      query: ({ id }) => ({
        path: `${notificationsPath}/${encodeURIComponent(id)}`,
      }),
    }),
    markRead: builder.mutation({
      query: ({ id }) => ({
        path: `${notificationsPath}/${encodeURIComponent(id)}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, error, { scope }) =>
        error ? [] : notificationTags(scope),
    }),
    markAllRead: builder.mutation({
      query: () => ({
        path: `${notificationsPath}/read-all`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, error, scope) =>
        error ? [] : notificationTags(scope),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
