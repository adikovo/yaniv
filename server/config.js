// Server timing constants. Overridable via env so tests can run with short delays.
const ROUND_DELAY_MS = Number(process.env.ROUND_DELAY_MS ?? 3000);
const REMATCH_TIMEOUT_MS = Number(process.env.REMATCH_TIMEOUT_MS ?? 10000);

// Browser origins allowed to connect (CORS + Socket.io). Read at call time so
// production can lock down via CLIENT_ORIGIN while local dev keeps the default.
const DEFAULT_CLIENT_ORIGINS = ["http://localhost:5173"];

function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN;
  if (!raw) return DEFAULT_CLIENT_ORIGINS;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

// cors-package-compatible origin callback, shared by Express and Socket.io.
// Allows requests with no Origin header (curl, same-origin, server-to-server)
// and any origin in the allow-list; rejects everything else.
function corsOrigin(origin, callback) {
  if (!origin || getAllowedOrigins().includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
}

module.exports = {
  ROUND_DELAY_MS,
  REMATCH_TIMEOUT_MS,
  DEFAULT_CLIENT_ORIGINS,
  getAllowedOrigins,
  corsOrigin,
};
