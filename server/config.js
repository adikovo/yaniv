// Server timing constants. Overridable via env so tests can run with short delays.
const ROUND_DELAY_MS = Number(process.env.ROUND_DELAY_MS ?? 3000);
const REMATCH_TIMEOUT_MS = Number(process.env.REMATCH_TIMEOUT_MS ?? 10000);

module.exports = { ROUND_DELAY_MS, REMATCH_TIMEOUT_MS };
