const STORAGE_KEY = "dinebook-saved-restaurants";
const EVENT_NAME = "dinebook:saved-restaurants-changed";

export function getSavedRestaurantIds() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export function isRestaurantSaved(id) {
  return getSavedRestaurantIds().includes(String(id));
}

export function toggleSavedRestaurant(id) {
  const current = getSavedRestaurantIds();
  const normalized = String(id);
  const next = current.includes(normalized)
    ? current.filter((value) => value !== normalized)
    : [...current, normalized];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT_NAME));
  return next.includes(normalized);
}

export function subscribeToSavedRestaurants(callback) {
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
