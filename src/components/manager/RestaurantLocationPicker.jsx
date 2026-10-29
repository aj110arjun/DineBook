import { MAP_TILE_URL, MAP_TILE_ATTRIBUTION } from "../../lib/serviceConfig.js";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./RestaurantLocationPicker.css";

export default function RestaurantLocationPicker({
  latitude,
  longitude,
  onConfirm,
  onLocate,
  locating,
}) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const [point, setPoint] = useState(null);
  const [tileError, setTileError] = useState(false);
  const hasLocation =
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  useEffect(() => {
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      minZoom: 3,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
    }).setView([20.5937, 78.9629], 5);
    mapRef.current = map;
    const tiles = L.tileLayer(
      MAP_TILE_URL,
      {
        maxZoom: 19,
        attribution:
          MAP_TILE_ATTRIBUTION,
      },
    ).addTo(map);
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("load", () => setTileError(false));
    map.on("moveend", () => {
      const center = map.getCenter();
      setPoint({ latitude: center.lat, longitude: center.lng });
    });
    map.on("click", (event) => map.panTo(event.latlng));
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasLocation && mapRef.current) {
      const next = { latitude: Number(latitude), longitude: Number(longitude) };
      mapRef.current.setView([next.latitude, next.longitude], 17);
      setPoint(next);
    }
  }, [latitude, longitude, hasLocation]);

  return (
    <section
      className="restaurant-location-picker"
      aria-label="Choose restaurant location"
    >
      <div className="restaurant-location-picker-heading">
        <div>
          <strong>Set your restaurant location</strong>
          <p>Move the map to place the pin at your restaurant entrance.</p>
        </div>
        <button type="button" onClick={onLocate} disabled={locating}>
          {locating ? "Locating…" : "Use current location"}
        </button>
      </div>
      <div className="restaurant-location-map-frame">
        <div
          ref={container}
          className="restaurant-location-map"
          aria-label="Interactive restaurant map. Use arrow keys to move and plus or minus to zoom."
        />
        <div className="restaurant-location-center-pin" aria-hidden="true">
          <MapPin size={42} fill="#79323d" color="white" strokeWidth={1.7} />
        </div>
        <span className="restaurant-location-map-hint">
          Move map to adjust pin
        </span>
      </div>
      {tileError && (
        <p role="alert">
          Map tiles could not load. Check your connection or select an address
          above.
        </p>
      )}
      <div className="restaurant-location-picker-footer">
        <p aria-live="polite">
          {point
            ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
            : "Search an address above, use your location, or move the map."}
        </p>
        <button
          type="button"
          disabled={!point || locating}
          onClick={() => onConfirm(point)}
        >
          Confirm location
        </button>
      </div>
    </section>
  );
}
