# Research: 005-multi-round-loop

## Decision: Round loop — auto-advance, no result screen

**New flow**: `yaniv` handler → emit `roundEnd` → `setTimeout(2s)` → `dealNewRound("nextRound")`. No player acknowledgement, no `readyForNextRound`.

**What to remove**:
- `readyForNextRound` socket handler
- `readyPlayers` and `readyTimers` state in socket.js
- `RoundResult` component (or repurpose as lightweight overlay)

**What to add**:
- `setTimeout` in the `yaniv` handler after emitting `roundEnd`
- Non-blocking "YANIV!" overlay on the client that auto-clears on `nextRound`

---

## Decision: resolveRound bugs (still need fixing, different context)

The `resolveRound` function and `readyForNextRound` handler are being removed entirely — bugs become moot. The `eliminatePlayers` double-call is fixed by deletion.

---

## Decision: gameOver payload

Same as before: `{ winner: { id, name }, players: { [key]: { id, name, score } } }`. Emitted from the `yaniv` handler (after the 2 s delay path) when only 1 survivor remains.

---

## Decision: US3 spectator mode (P2 — deferred)

Not in scope. Will be a separate feature.
