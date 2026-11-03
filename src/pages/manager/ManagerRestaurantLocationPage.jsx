import { GEOCODING_BASE_URL } from "../../lib/serviceConfig.js";
import axios from "axios";
import { useEffect, useState } from "react";
import { MapPin, Save } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

export default function ManagerRestaurantLocationPage() {
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    requestJson("/api/auth/manager/me")
      .then((manager) => {
        if (
          active &&
          manager.restaurant_latitude != null &&
          manager.restaurant_longitude != null
        ) {
          setPin({
            latitude: manager.restaurant_latitude,
            longitude: manager.restaurant_longitude,
          });
          setMessage("Your restaurant already has a saved map pin.");
        }
      })
      .catch(
        () => active && setError("Could not load your restaurant location."),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 4) {
      setSuggestions([]);
      setBusy(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const response = await axios.request({
          url: `${GEOCODING_BASE_URL}/api/?q=${encodeURIComponent(search)}&limit=5&lang=en`,
          validateStatus: () => true,
          signal: controller.signal,
        });
        if (response.status < 200 || response.status >= 300)
          throw new Error("Location search is unavailable.");
        const data = response.data;
        if (!controller.signal.aborted) setSuggestions(data.features || []);
      } catch (reason) {
        if (!axios.isCancel(reason))
          setError("Could not search locations right now. Please try again.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function chooseLocation(feature) {
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError(
        "That result does not include a map location. Choose another result.",
      );
      return;
    }
    const place = feature.properties || {};
    setPin({ latitude, longitude });
    setQuery(
      [place.name, place.street, place.city || place.district, place.state]
        .filter(Boolean)
        .join(", "),
    );
    setSuggestions([]);
    setError("");
    setMessage(
      "Location selected. Save it to update nearby restaurant results.",
    );
  }

  async function saveLocation() {
    if (!pin) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await requestJson("/api/auth/manager/restaurant/location", {
        method: "PUT",
        data: JSON.stringify(pin),
      });
      setMessage(
        "Restaurant map pin saved. Customers can now find you in nearby searches.",
      );
    } catch (reason) {
      setError(reason.message || "Could not save the restaurant location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerLayout title="Restaurant Location">
      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-wine">
              <MapPin size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Set your restaurant map pin
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Search your address and choose the correct map result. This
                helps customers find restaurants near them.
              </p>
            </div>
          </div>
          <label
            className="mb-2 block text-sm font-semibold text-ink"
            htmlFor="restaurant-location-search"
          >
            Restaurant address
          </label>
          <div className="relative">
            <input
              id="restaurant-location-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPin(null);
                setMessage("");
              }}
              placeholder="Search street, area, city…"
              className="h-11 w-full rounded-lg border border-stone-300 px-3 text-sm outline-none focus:border-wine"
            />
            {(busy || suggestions.length > 0) && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                {busy && (
                  <p className="px-3 py-2 text-sm text-stone-500">Searching…</p>
                )}
                {suggestions.map((feature, index) => {
                  const place = feature.properties || {};
                  const title =
                    [place.name, place.street].filter(Boolean).join(" ") ||
                    "Address result";
                  const subtitle = [
                    place.city || place.district || place.county,
                    place.state,
                    place.postcode,
                    place.country,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      type="button"
                      key={`${place.osm_id || title}-${index}`}
                      onClick={() => chooseLocation(feature)}
                      className="block w-full border-b border-stone-100 px-3 py-3 text-left last:border-0 hover:bg-stone-50"
                    >
                      <strong className="block text-sm text-ink">
                        {title}
                      </strong>
                      <span className="text-xs text-stone-500">{subtitle}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {pin && (
            <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
              <iframe
                title="Restaurant map pin preview"
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${pin.latitude},${pin.longitude}&output=embed`}
              />
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-3 text-sm text-emerald-700" role="status">
              {message}
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveLocation}
              disabled={!pin || saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-wine px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save map pin"}
            </button>
          </div>
        </section>
      </main>
    </ManagerLayout>
  );
}
