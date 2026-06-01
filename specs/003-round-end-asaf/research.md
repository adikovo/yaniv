# Research: Round End Event & Asaf Detection

## Score Tracking

**Decision**: Add `score: 0` to each player object at game start (in `dealCards` or when seeding `games[room]`).

**Rationale**: Score is per-player persistent state across rounds. The `games[room].players` object already holds per-player data (hand, sum). Score fits naturally alongside those fields.

**Alternatives considered**: Separate scores map keyed by player ID — rejected, unnecessary indirection.

---

## Asaf Detection Logic

**Decision**: In `yanivCall`, compare every non-caller player's `sum` against the caller's `sum`. If any `sum <= caller.sum`, Asaf is triggered. Penalty = 30 + caller's sum added to caller's score. Normal win: each losing player adds their own `sum` to their score.

**Rationale**: Matches the spec rule — Asaf applies when any other player holds ≤ the caller's hand value. Penalty is 30 + hand sum per user preference.

**Edge case**: If the Yaniv caller ties with another player (equal hands) → Asaf applies (spec: "equal OR lower").

---

## Ready-Up / Next Round Mechanic

**Decision**: Server-side `readyForNextRound` handler. Tracks a `readyPlayers` set per room. On first click, starts a 15-second `setTimeout`. When timer fires: removes non-ready players from `game.players`, runs `eliminatePlayers` (score > 100), then either re-deals and emits `nextRound` (≥ 2 remain) or emits `gameOver` (< 2 remain).

**Rationale**: Server owns the authoritative player list and timing. Client just emits a signal and renders a countdown.

**Alternatives considered**: Client-side countdown only — rejected, server must be authoritative on who stays.

---

## Player Elimination

**Decision**: `eliminatePlayers(game)` in `gameLogic.js` — iterates `game.players`, deletes entries with `score > 100`, returns array of eliminated player objects.

**Rationale**: Separate function keeps socket handler clean and makes the elimination logic independently testable.

---

## Socket Events

| Event | Direction | Payload |
|---|---|---|
| `roundEnd` | server → all clients | `{ winner, asaf, asafCaller, players: { [id]: { hand, sum, score } } }` |
| `readyForNextRound` | client → server | (none, room inferred from socket) |
| `nextRound` | server → all clients | `{ top_card, current_turn, deck }` + individual `hand` events |
| `gameOver` | server → all clients | `{ reason: "not enough players" }` |

---

## Client Result Screen

**Decision**: New `RoundResult` component rendered conditionally in `game/index.jsx` when `roundResult` state is set. Shows winner, Asaf label, each player's hand + score, and a "Next Round" button with a 15s visual countdown. Button emits `readyForNextRound` once.

**Rationale**: Inline conditional in the game page is the simplest approach — no routing needed.
