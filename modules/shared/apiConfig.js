const configuredApiUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:5000/api").replace(/\/+$/, "");

export const API_BASE_URL = /\/api$/i.test(configuredApiUrl)
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

export const API_ORIGIN = new URL(
  API_BASE_URL,
  typeof window === "undefined" ? "http://localhost:5000" : window.location.origin
).origin;
