// REST recovers notifications missed while the live connection was starting or
// reconnecting. Keep delivery IDs shared by REST and SSE to prevent two toasts.
export function createNotificationDelivery({ request, onNotification, startedAt = Date.now() }) {
  const controller = new AbortController();
  const seen = new Set();
  const pending = new Map();
  let refreshPromise = null;
  let needsRecovery = true;

  function deliver(item) {
    if (controller.signal.aborted || !item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    onNotification(item);
  }

  async function refresh() {
    if (controller.signal.aborted) return;
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const result = await request("/api/notifications?limit=100", {
          signal: controller.signal,
        });
        // The API returns newest first. Don't toast old history on page load.
        for (const item of [...(result.items || [])].reverse()) {
          const value = item.created_at || "";
          const timestamp = Date.parse(
            /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`,
          );
          if (timestamp >= startedAt) deliver(item);
        }
        needsRecovery = false;
      } catch {
        needsRecovery = true;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  async function receive(id) {
    if (!id || controller.signal.aborted || seen.has(id)) return;
    if (pending.has(id)) return pending.get(id);
    const promise = (async () => {
      try {
        deliver(await request(`/api/notifications/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        }));
      } catch {
        // The SSE cursor already advanced, so waiting for a replay loses this
        // notification. Recover through the list endpoint instead.
        needsRecovery = true;
        await refresh();
      } finally {
        pending.delete(id);
      }
    })();
    pending.set(id, promise);
    return promise;
  }

  return {
    receive,
    refresh,
    needsRecovery: () => needsRecovery,
    dispose: () => controller.abort(),
  };
}
