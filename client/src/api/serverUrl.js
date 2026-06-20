// Base URL of the Yaniv server, injected at build time by Vite.
// Unset (local dev) -> falls back to the local server. In production the value
// is set in Netlify (VITE_SERVER_URL) and baked into the build.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
