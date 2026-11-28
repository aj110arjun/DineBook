import { formatLocalDateTime, formatLocalTime, getAccountDateTimePreferences } from "./localDate.js";

export const KITCHEN_ACTION_LABELS = {
  ACCEPTED: "Accept order", PREPARING: "Start preparing", READY: "Mark as ready", SERVED: "Mark as served",
};

export const orderReference = (id) => `ORD-${id.slice(0, 8).toUpperCase()}`;
export const preparationLabel = (value) => value == null ? "Unavailable" : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)} min`;

export function elapsedLabel(seconds) {
  if (seconds == null) return "No active orders";
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 1) return "Less than 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export function kitchenInstant(value, timezone, date = false, { restaurantLocal = false } = {}) {
  const preferences = getAccountDateTimePreferences();
  if (preferences) {
    const formatting = restaurantLocal ? { ...preferences, timezone } : preferences;
    return date ? formatLocalDateTime(value, {}, formatting) : formatLocalTime(value, {}, formatting);
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, ...(date ? { day: "numeric", month: "short" } : {}), hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

/** Coalesce refreshes, cancel stale filters, and retain same-filter data on transient errors. */
export function createChefDashboardLoader(request, onState) {
  let sequence = 0, pending = null, data = null, currentQuery = "", lastLoaded = 0;
  const cancel = () => { sequence += 1; pending?.controller.abort(); pending = null; };
  return {
    cancel,
    get lastLoaded() { return lastLoaded; },
    load(params, { force = false } = {}) {
      const query = new URLSearchParams(params).toString();
      if (pending?.query === query && !force) return pending.promise;
      cancel();
      const ticket = sequence;
      if (query !== currentQuery) data = null;
      currentQuery = query;
      const controller = new AbortController();
      onState({ data, loading: true, error: "" });
      const promise = Promise.resolve().then(() => request(`/api/chef/dashboard?${query}`, {
        signal: controller.signal, timeout: 15000, fallbackMessage: "Could not refresh the kitchen dashboard. Please try again.",
      })).then((result) => {
        if (ticket !== sequence) return null;
        data = result;
        lastLoaded = Date.now();
        onState({ data, loading: false, error: "" });
        return data;
      }).catch((error) => {
        if (ticket !== sequence || error.name === "AbortError") return null;
        if ([401, 403].includes(error.status)) data = null;
        onState({ data, loading: false, error: error.message || "Could not load the kitchen dashboard." });
        return null;
      }).finally(() => { if (ticket === sequence) pending = null; });
      pending = { query, promise, controller };
      return promise;
    },
  };
}

/** The server supplies valid actions from its existing chef transition map. */
export function createKitchenActions({ request, refresh, confirm, onBusy, onNotice }) {
  const pending = new Map();
  return (order, status) => {
    if (pending.has(order.id)) return pending.get(order.id);
    if (!order.allowed_actions.includes(status) || !KITCHEN_ACTION_LABELS[status]) return Promise.resolve(false);
    onBusy(order.id, true);
    const action = Promise.resolve().then(async () => {
      if (["READY", "SERVED"].includes(status) && !await confirm(`${KITCHEN_ACTION_LABELS[status]} for ${orderReference(order.id)}?`)) return false;
      onNotice({ message: "", error: false });
      try {
        await request(`/api/chef/orders/${order.id}/status`, { method: "PATCH", body: { status }, timeout: 15000 });
        onNotice({ message: `${orderReference(order.id)} updated.`, error: false });
        await refresh(true);
        return true;
      } catch (error) {
        onNotice({ message: error.message || "Could not update this order.", error: true });
        // A failed response may follow a committed update; reconcile with REST.
        await refresh(true);
        return false;
      }
    }).finally(() => { pending.delete(order.id); onBusy(order.id, false); });
    pending.set(order.id, action);
    return action;
  };
}
