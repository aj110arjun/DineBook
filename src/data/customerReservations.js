const storageKey = (email) => `dinebook-reservations:${String(email || "guest").toLowerCase()}`;

export function getSavedReservations(email) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(email)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveReservation(email, reservation) {
  if (!reservation?.id) return;
  const current = getSavedReservations(email).filter((item) => item.id !== reservation.id);
  localStorage.setItem(storageKey(email), JSON.stringify([reservation, ...current]));
}

export function mergeReservations(apiItems, email) {
  const merged = new Map(getSavedReservations(email).map((item) => [item.id, item]));
  (Array.isArray(apiItems) ? apiItems : []).forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
  return [...merged.values()].sort((a, b) => `${b.reservation_date}T${b.start_time}`.localeCompare(`${a.reservation_date}T${a.start_time}`));
}
