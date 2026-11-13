export const DEFAULT_GENERAL = Object.freeze({
  theme: "system", language: "en", date_format: "DD/MM/YYYY", time_format: "12h", timezone: null,
});

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function watchThemePreference(theme, root, media) {
  const apply = () => { root.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme; };
  apply();
  if (theme === "system") media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}

export function timezoneOptions() {
  const zones = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["America/Los_Angeles", "America/New_York", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Paris"];
  return [...new Set(["UTC", browserTimezone(), ...zones])].sort();
}

// One store per authenticated customer; detached responses cannot affect a later account.
export function createCustomerSettingsStore(request) {
  let snapshot = { settings: null, loading: false, pending: null, error: null, success: "" };
  let loadingPromise = null;
  const listeners = new Set();
  const publish = (changes) => {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((listener) => listener());
  };

  function load() {
    if (loadingPromise) return loadingPromise;
    publish({ loading: true, error: null });
    loadingPromise = request("/api/customer/settings")
      .then((settings) => publish({ settings, error: null }))
      .catch((error) => publish({ error }))
      .finally(() => {
        loadingPromise = null;
        publish({ loading: false });
      });
    return loadingPromise;
  }

  async function save(section, key, value) {
    if (!snapshot.settings || snapshot.pending || snapshot.loading) return false;
    const previous = snapshot.settings;
    publish({ pending: key, error: null, success: "",
      ...(section === "general" ? { settings: { ...previous, general: { ...previous.general, [key]: value } } } : {}),
    });
    try {
      const settings = await request(`/api/customer/settings/${section}`, { method: "PATCH", body: { [key]: value } });
      publish({ settings, success: "Settings saved." });
      return true;
    } catch (error) {
      publish({ settings: previous, error });
      return false;
    } finally {
      publish({ pending: null });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    load, save,
  };
}
