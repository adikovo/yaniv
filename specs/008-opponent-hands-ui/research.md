# Research: Opponent Hands UI

## Decision 1: How to deliver opponent hand sizes to clients

**Decision**: Extend the existing `turn` server event to include a `hand_sizes` map `{ [playerId]: count }` for all active players.

**Rationale**: The `turn` event is already broadcast to the whole room after every action (draw from deck, draw from top card). Attaching hand sizes here means every client is always in sync with the correct count after each turn with zero extra round-trips. An alternative "opponentUpdate" event was considered but rejected because it would duplicate the timing logic already handled by the turn event.

**Alternatives considered**:
- A dedicated `opponentUpdate` event — adds complexity with no benefit since turn timing already covers it.
- Sending full hand arrays for opponents — rejected: exposes card values to clients who could inspect network traffic.

---

## Decision 2: Card back asset

**Decision**: Add a `public/cards/back.png` asset. The YANIV-branded card back shown in the reference screenshots does not exist in the current repo (`public/cards/` contains only 54 face-up cards and two jokers). A card back image must be sourced or created and placed at `public/cards/back.png` before the OpponentArea component can render correctly.

**Rationale**: The Card component constructs image paths as `cards/{value}_of_{suit}.png`. A face-down variant needs a predictable path (`cards/back.png`) that follows the same convention.

**Alternatives considered**:
- Reuse the deck button area as a reference — not applicable since the current deck is a plain `<button>`, not an image.
- Use a CSS-only card back (solid color + border) — acceptable fallback if asset is unavailable, but the reference screenshots show a branded card back.

---

## Decision 3: Score persistence on the client

**Decision**: Add an `opponentScores` state map `{ [playerId]: score }` to game context. Populate it from the `roundEnd` event (which already sends `players[id].score` for all players), and initialize to 0 at game start.

**Rationale**: Scores are only calculated server-side at round end. The `roundEnd` event already carries the full `players` object with scores, so no new server changes are needed for scores.

**Alternatives considered**:
- Include scores in the `turn` event — unnecessary overhead since scores only change at round end.

---

## Decision 4: Opponent position assignment

**Decision**: Positions (top / left / right) are assigned by turn order relative to the local player. Given the `players` array (ordered by lobby join order) and the local player's index:

| Player count | Opponent positions |
|---|---|
| 2 players | 1 opponent → top |
| 3 players | next in turn order → right; previous → left |
| 4 players | next → right; across → top; previous → left |

**Rationale**: This matches how physical card games work — the player "to your left" goes before you, "to your right" goes after you. Consistent with the user's approval in the spec clarification phase.

**Alternatives considered**:
- Fixed seat ordering (player 2 always top, player 3 always right) — rejected because it ignores turn order and feels arbitrary.

---

## Decision 5: Layout strategy

**Decision**: Use CSS Grid with named template areas on the game board container. The grid layout switches based on player count using a CSS class or inline style.

```
2-player:          3-player:           4-player:
[  top   ]         [ left | right ]     [ left | top | right ]
[ center ]         [    center    ]     [      center       ]
[ bottom ]         [    bottom    ]     [      bottom       ]
```

**Rationale**: Grid named areas make it trivial to place each `OpponentArea` in the right zone without absolute positioning math. The local player's hand area always occupies the `bottom` zone.

**Alternatives considered**:
- Absolute positioning — works but makes responsive adjustments harder.
- Flexbox columns/rows — achieves the layout but requires nested wrappers and is harder to reason about.

---

## Decision 6: No new server events for disconnect

**Decision**: The existing `playerDisconnected` event (emits `{ name, id }`) is sufficient. The client will use this to remove the player from the opponents list and the layout will re-derive positions from the updated list.

**Rationale**: Already implemented in branch 007. The `players` state in game context must also remove the disconnected player (currently it doesn't — that's a small fix needed on the client side).
