const queue = [];
const listeners = new Set();

export function subscribeToConfirm(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingConfirm() {
  return queue[0] || null;
}

export function confirmAction(message) {
  return new Promise((resolve) => {
    queue.push({ message, resolve });
    listeners.forEach((listener) => listener());
  });
}

export function settleConfirm(request, accepted) {
  if (!request || queue[0] !== request) return;
  queue.shift();
  request.resolve(Boolean(accepted));
  listeners.forEach((listener) => listener());
}
