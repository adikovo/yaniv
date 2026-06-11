// Runs before any module is loaded (jest setupFiles).
// Shrinks server timing constants so integration tests don't wait out real delays.
process.env.ROUND_DELAY_MS = process.env.ROUND_DELAY_MS ?? '150';
process.env.REMATCH_TIMEOUT_MS = process.env.REMATCH_TIMEOUT_MS ?? '500';
