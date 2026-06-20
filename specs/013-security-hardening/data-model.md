# Phase 1 Data Model: CI Hardening & Security

This feature adds no persistent data. The "entities" here are the **shapes of inbound real-time payloads** and the **validation rules** applied to them. They define the contract the server enforces, not new storage.

## Entity: Player Name

A user-controlled string supplied at join time, broadcast to all players, and rendered on multiple screens.

| Attribute | Rule |
|-----------|------|
| length | 1–20 characters **after** trimming surrounding whitespace |
| charset | letters, numbers, spaces, common punctuation |
| empty | rejected if empty/whitespace-only after trimming |
| markup chars (`<`, `>`, `&`, quotes) | **allowed** at validation; neutralized at render (escaped by React) |
| normalization | trim surrounding whitespace before validating; no other rewriting |

**Render sites** (must stay auto-escaped): `lobby/index.jsx`, `round-result/index.jsx`, `opponent-area` (via `name` prop), `game/index.jsx` opponent list.

## Entity: Inbound Event Message

A message from a client identified by an event name with a payload. Each event has an expected shape; anything else is rejected (early return, no throw, no state mutation).

### `joinRoom` — `{ player, room }`
| Field | Rule |
|-------|------|
| `player` | object, required |
| `player.id` | non-empty string |
| `player.name` | satisfies **Player Name** rules above |
| `room` | non-empty string, bounded length (e.g. ≤ 64) |
| invalid → | do not join; do not create/populate `rooms[room]` |

### `makeTurn` — `(room, turn_data)`
| Field | Rule |
|-------|------|
| `room` | non-empty string; `games[room]` must exist |
| `turn_data` | object, required |
| `turn_data.type` | one of `cardFromDeck`, `cardFromTop`, `cardFromHand`, `yaniv` |
| `turn_data.selected_cards` | array; each element a valid index into the caller's current hand (integer, `0 ≤ i < hand.length`); no duplicates; non-empty where the action requires a discard |
| `turn_data.side` | for `cardFromTop`: a permitted side value only |
| invalid → | reject move; game state unchanged; existing `turnError` channel may inform the caller |

*Existing semantic guards (caller is a real player in the room; caller is the current turn) are preserved; payload validation is layered in front of them.*

### `chatMessage` — `message`
| Field | Rule |
|-------|------|
| `message` | string; bounded length (e.g. ≤ 500); rejected if not a string |
| invalid → | do not broadcast |

### `startGame` — *(no payload)*
| Rule |
|------|
| Guard that `room` resolves and `games[room]` exists before touching `games[room].eliminated` (currently throws a TypeError → process crash if absent) |

### Payload-less events — `spectatorJoin`, `rematchReady`, `leaveRoom`, `disconnect`
Already guard `room` / `games[room]` existence. Confirm no unguarded dereference remains; tighten only if a gap is found.

## Validation Result Contract

Each validator is a pure function. Recommended shape (final form decided at implementation):

```
validateJoinRoom(payload) -> { ok: true, value } | { ok: false, reason }
```

- `ok: true` → handler proceeds (using the normalized `value`, e.g. trimmed name).
- `ok: false` → handler returns early without mutating state; may emit an error on an existing channel where one exists.
- Validators never throw on malformed input — malformed input is an expected case, not an exception.
