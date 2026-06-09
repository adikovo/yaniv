# Data Model: Opponent Hands UI

## Client-Side State Changes

### game-context — new/changed state

| State field | Type | Description |
|---|---|---|
| `opponentScores` | `{ [playerId: string]: number }` | Cumulative game scores for all players. Updated from `roundEnd`. |
| `handSizes` | `{ [playerId: string]: number }` | Current hand card count per player. Updated from `turn` event (new field). |

The existing `players` array already holds `{ id, name }` for all players. It must also be updated on `playerDisconnected` to remove the departed player (currently it is not).

---

## Server-Side Changes

### `turn` event payload (extended)

Current shape:
```json
{ "top_card": [...], "current_turn": "playerId", "deck": [...] }
```

New shape:
```json
{
  "top_card": [...],
  "current_turn": "playerId",
  "deck": [...],
  "hand_sizes": { "playerId1": 4, "playerId2": 3 }
}
```

`hand_sizes` is computed from `Object.entries(games[room].players).reduce(...)` using each player's `hand.length`.

The `roundEnd` event already carries the full `players` object (with `hand`, `sum`, `score` per player) — no changes needed there for scores.

---

## New UI Components

### `OpponentArea` props

| Prop | Type | Description |
|---|---|---|
| `name` | string | Player's display name |
| `handCount` | number | Number of face-down cards to render |
| `score` | number | Player's current cumulative score |
| `isActive` | boolean | Whether it is currently this player's turn |
| `position` | `'top' \| 'left' \| 'right'` | Which table position this area occupies |

### `FaceDownCard` props

| Prop | Type | Description |
|---|---|---|
| (none) | — | Renders `cards/back.png`. No interactive props needed. |

---

## Position Derivation Logic

Given:
- `players: Player[]` — ordered by join/lobby order
- `localPlayerId: string` — the current client's player ID
- `playerCount: number` — `players.length`

Position map by player count:

```
playerCount === 2:
  [0] localPlayer → bottom
  [1] other       → top

playerCount === 3:
  localPlayer idx = L
  (L+1) % 3 → right
  (L+2) % 3 → left

playerCount === 4:
  localPlayer idx = L
  (L+1) % 4 → right
  (L+2) % 4 → top
  (L+3) % 4 → left
```

This logic lives in a pure helper function `getOpponentPositions(players, localPlayerId)` that returns `{ [playerId]: position }`.

---

## Asset

| Path | Description |
|---|---|
| `client/public/cards/back.png` | Card back image used by FaceDownCard. Must be added before implementation. |
