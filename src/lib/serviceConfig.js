// Public service configuration. Never put credentials in VITE_* variables.
const baseUrl = (value, fallback) => (value?.trim() || fallback).replace(/\/+$/, "");

export const GEOCODING_BASE_URL = baseUrl(import.meta.env.VITE_GEOCODING_BASE_URL, "https://photon.komoot.io");
export const POSTAL_API_BASE_URL = baseUrl(import.meta.env.VITE_POSTAL_API_BASE_URL, "https://api.postalpincode.in");
export const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL?.trim() || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Keep the attribution consistent with the configured tile provider.
export const MAP_TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
