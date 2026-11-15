import { API_BASE, requestJson } from "./authApi.js";
import { formatLocalDate, formatLocalDateTime, formatWallTime } from "./localDate.js";

const CARD_FIELDS = {
  reservation: ["Status", "Date", "Start time", "Guests", "Fee payment"],
  order: ["Status", "Total", "Payment", "Service", "Placed"],
  wallet: ["Balance", "Type", "Amount", "Recorded"],
  payment: ["Status", "Amount", "Type", "Recorded", "Created"],
  refund: ["Status", "Amount", "Destination", "Recorded", "Fee payment", "Reservation fee"],
  restaurant: ["Cuisine", "City", "Address"],
  hours: ["Date", "Hours"],
  availability: ["Availability", "Date", "Time", "Guests", "Duration (minutes)"],
  offer: ["Code", "Discount", "Minimum subtotal", "Your usage limit"],
  manager_summary: ["Orders", "Reservations", "Expected guests", "Recorded revenue", "Active orders shown", "Available tables", "Occupied tables", "Reserved tables", "Maintenance tables"],
  manager_revenue: ["Gross collections", "Refunds", "Commission", "Revenue after refunds", "Net revenue"],
  manager_tables: ["Total", "Available", "Occupied", "Reserved", "Maintenance", "Occupancy percent"],
};
const FIELD_LABELS = {
  "Start time": "Time", "Fee payment": "Booking payment", "Reservation fee": "Booking fee",
  "Minimum subtotal": "Minimum spend", "Your usage limit": "Usage", "Duration (minutes)": "Duration",
};

export function supportCardFields(card) {
  // Keep references and secondary facts available without crowding the answer.
  const entries = Object.entries(card.fields || {}).filter(([key]) => key !== "Restaurant ID");
  const keys = CARD_FIELDS[card.kind] || entries.slice(0, 4).map(([key]) => key);
  return {
    primary: keys.flatMap((key) => entries.filter(([label]) => label === key)),
    secondary: entries.filter(([key]) => !keys.includes(key)),
  };
}

export function supportFieldLabel(key, fields) {
  const label = FIELD_LABELS[key] || key;
  return ["Start time", "Time", "Hours"].includes(key) && fields.Timezone === "Asia/Kolkata" ? `${label} (IST)` : label;
}

export function supportFieldValue(key, value) {
  if (["Date", "From", "Through"].includes(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatLocalDate(value);
  if (key === "Occupancy percent" && /^\d+(?:\.\d+)?$/.test(value)) return `${value}%`;
  if (["Start time", "Time"].includes(key)) return formatWallTime(value);
  if (["Created", "Placed", "Recorded", "Preparation started", "Ready"].includes(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatLocalDateTime(value);
  }
  if (key === "Hours") return value.replace(/\b\d{2}:\d{2}\b/g, (time) => formatWallTime(time));
  if (key === "Timezone" && value === "Asia/Kolkata") return "India (IST)";
  if (key === "Duration (minutes)" && /^\d+$/.test(value)) return `${value} min`;
  if (/^INR -?\d+(?:\.\d+)?$/.test(value)) return value.replace("INR ", "₹");
  if (["Status", "Payment", "Fee payment", "Preorder payment", "Payment method", "Service", "Type", "Applies to"].includes(key) && /^[A-Z][A-Z_]+$/.test(value)) {
    const labels = { PAY_AT_DESK: "Pay at restaurant", DINE_IN: "Dine-in", PENDING_PAYMENT: "Awaiting payment", UPI: "UPI" };
    return labels[value] || value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
  }
  return value;
}

export const customerAiPath = "/api/customer/ai";
export const SUPPORT_MAX_MESSAGE_LENGTH = 1000;
export const SUPPORT_MAX_MESSAGE_BYTES = 3000;
export const SUPPORT_REPLY_TIMEOUT_MS = 125000;

export function supportDraftError(text, maxLength = SUPPORT_MAX_MESSAGE_LENGTH) {
  if (!text.trim()) return "Write a message to get started.";
  if (text.length > maxLength) return `Keep your message under ${maxLength.toLocaleString()} characters.`;
  if (new TextEncoder().encode(text.trim()).length > SUPPORT_MAX_MESSAGE_BYTES) return "This message is too long. Please shorten it and try again.";
  return "";
}

export function supportErrorMessage(reason) {
  if (reason.status === 401) return "Your session has expired. Please sign in again.";
  if (reason.status === 403) return "AI support is available only to customer accounts. Sign in with a customer account.";
  if (reason.status === 504 || reason.code === "ECONNABORTED" || ["ECONNABORTED", "ETIMEDOUT"].includes(reason.cause?.code)) return "This is taking longer than expected. Please try again.";
  if (reason.status >= 500) return "The AI assistant is temporarily unavailable. Please try again.";
  if (reason.status === 404) return "This conversation is no longer available. Start a new chat.";
  if ([409, 422, 429].includes(reason.status)) return reason.message || "Please wait a moment and try again.";
  if (reason instanceof TypeError || reason.cause?.code === "ERR_NETWORK") return "We couldn't connect to the server. Check your connection and retry.";
  return "We couldn't finish this reply. Please try again.";
}

export const supportJson = (path, options = {}) => requestJson(`${customerAiPath}${path}`, {
  timeout: 10000, fallbackMessage: "Customer support is unavailable. Please try again.", ...options,
});

export function supportMessageId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function safeSupportHref(value, supportUrl = "") {
  if (typeof value !== "string") return null;
  if (/^\/customer(?:\/[a-zA-Z0-9/?#=&%._~-]*)?$/.test(value)) {
    try {
      const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
      if (!pathname.split("/").some((part) => [".", ".."].includes(part)) && !/[\\\x00-\x1f]/.test(pathname)) return value;
    } catch { return null; }
  }
  if (value === supportUrl && value.startsWith("https://")) return value;
  return null;
}

export async function readSupportEvents(reader, onEvent) {
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 65536) throw new Error("Support returned an oversized reply.");
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const lines = block.split(/\r?\n/);
        const name = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!name || !data) continue;
        let parsed;
        try { parsed = JSON.parse(data); } catch { throw new Error("Support returned an unreadable reply."); }
        if (name === "error") {
          const error = new Error(parsed.message || "Unable to prepare a reply.");
          error.status = parsed.status;
          throw error;
        }
        if (name === "done") {
          if (typeof parsed.reply !== "string" || !Array.isArray(parsed.cards)) throw new Error("Support returned an unreadable reply.");
          complete = true;
        }
        onEvent(name, parsed);
        if (complete) return;
      }
      if (done) break;
    }
    if (!complete) throw new Error("The reply was interrupted. Retry to recover it.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function streamSupportReply(conversationId, payload, { signal, onEvent }) {
  const response = await fetch(`${API_BASE}${customerAiPath}/conversations/${encodeURIComponent(conversationId)}/messages/stream`, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(typeof body.detail === "string" ? body.detail : "Unable to reach customer support.");
    error.status = response.status;
    throw error;
  }
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("Support returned an unexpected response.");
  }
  await readSupportEvents(response.body.getReader(), onEvent);
}

export function supportSummary(messages) {
  return ["DineBook customer support summary", ...messages.slice(-6).map((message) =>
    `${message.sender}: ${message.content}\n${(message.answer?.cards || []).map((card) =>
      `${card.title}: ${Object.entries(card.fields).map(([label, value]) => `${label}: ${value}`).join("; ")}`).join("\n")}`)].join("\n\n");
}
