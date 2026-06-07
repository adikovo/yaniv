# Socket Event Contracts: 005-multi-round-loop

## Client → Server

| Event | Payload | When |
|-------|---------|------|
| `rematchReady` | *(none)* | Player clicks "Rematch" on game-over screen |

*(`readyForNextRound` is removed — rounds auto-advance server-side)*

## Server → Client

| Event | Payload | When |
|-------|---------|------|
| `roundEnd` | `{ winner, asaf, asafCaller, players, eliminated }` | Immediately after Yaniv call |
| `nextRound` | `{ top_card, current_turn, deck }` | ~2 s after `roundEnd`, when ≥ 2 players remain |
| `hand` | `{ hand, hand_sum }` | Per-socket after `nextRound` is dealt |
| `gameOver` | `{ winner: { id, name }, players: { [key]: { id, name, score } } }` | When only 1 survivor remains |
| `start` | `{ top_card, current_turn, deck }` | After all players emit `rematchReady` (or 10 s timeout) |

## Invariants

- `nextRound` fires exactly 2 seconds after `roundEnd` (server `setTimeout`).
- `gameOver` fires instead of `nextRound` when only 1 non-eliminated player remains.
- `rematchReady` is idempotent — sending it twice has no effect.
- Rematch resets all scores to 0 and clears the eliminated list.
