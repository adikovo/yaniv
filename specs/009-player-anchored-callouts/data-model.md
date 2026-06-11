# Data Model: Player-Anchored Yaniv/Asaf Call-Outs

No persisted data changes. One server payload change; all other new data is transient client state.

## Changed: `roundEnd` event payload

| Field | Type | Status | Meaning |
|-------|------|--------|---------|
| `winner` | `{ id, name }` | unchanged | Round winner (player with the lowest sum among all counters). |
| `asaf` | `boolean` | unchanged | Whether the Yaniv call was countered. |
| `yanivCaller` | `{ id, name }` | **NEW** | The player who called Yaniv — always present; the "YANIV!" anchor. |
| `asafPlayers` | `[{ id, name }]` | **NEW** | All players with sum ≤ caller's sum — each gets an "ASAF!" call-out. Empty array when `asaf` is false. |
| `asafCaller` | — | **REMOVED** | Was the Yaniv caller, set only when `asaf` (confusing name); its only consumer was the deleted centered overlay. |
| `players` | map | unchanged | Updated scores (already consumed by scoreboard logic). |
| `eliminated` | array | unchanged | Players eliminated this round (drives the spectator prompt). |

Supporting change: `gameLogic.yanivCall(game)` returns `{ winner, asaf, caller }` (caller always; previously `asafCaller` only when asaf).

## New client state (game page)

| State | Type | Lifecycle |
|-------|------|-----------|
| `yanivResult` | existing | Unchanged: set on `roundEnd`, cleared 1.5s after `nextRound` (also triggers spectator prompt for eliminated players). |
| `showAsaf` | `boolean` (from `useAsafSequence(yanivResult)` hook) | `false` → `true` ~1500ms after an asaf `roundEnd`; resets to `false` when `yanivResult` clears; timer in a ref, cleaned on change/unmount. |

## CallOut descriptor (per player, computed inline — not stored)

```text
calloutFor(playerId) →
    null                                  no round end, or player not an actor
    { variant: 'yaniv', penalty: false }  playerId === yanivResult.yanivCaller.id
    { variant: 'asaf',  penalty: true }   yanivResult.asaf && showAsaf &&
                                          yanivResult.asafPlayers.some(p => p.id === playerId)
```

- `variant`: which word renders ("YANIV!" / "ASAF!") and which color scheme applies.
- `penalty`: renders the "+30" subtext (always true for the asaf variant — the caller's penalty, FR-004).

## Timing (round-end window)

```text
t = 0.0s   roundEnd received        → YANIV! pops over yanivCaller
t ≈ 1.5s   (asaf only)              → ASAF! pops over winner (the counterer)
t = 3.0s   nextRound received       → new hands/board state applied
t = 4.5s   yanivResult cleared      → call-outs unmount; spectator prompt if eliminated
```
