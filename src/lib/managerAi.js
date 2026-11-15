import { requestJson } from "./authApi.js";
import { supportErrorMessage, supportSummary } from "./customerAi.js";

export const managerAiJson = (path, options = {}) => requestJson(`/api/manager/ai${path}`, {
  timeout: 10000, fallbackMessage: "Manager support is unavailable. Please try again.", ...options,
});

export function managerAiError(reason) {
  if (reason.status === 403) return "Manager access is unavailable. Check your account and restaurant approval, then sign in again.";
  return supportErrorMessage(reason);
}

export function safeManagerHref(value) {
  if (typeof value !== "string" || !/^\/manager(?:\/[a-zA-Z0-9/?#=&%._~-]*)?$/.test(value)) return null;
  try {
    const path = decodeURIComponent(value.split(/[?#]/)[0]);
    if (path.split("/").some((part) => [".", ".."].includes(part)) || /[\\\x00-\x1f]/.test(path)) return null;
    return value;
  } catch { return null; }
}

export function managerAiSummary(messages) {
  return supportSummary(messages).replace("DineBook customer support summary", "DineBook manager support summary");
}
