# Data Model: 005-multi-round-loop

## Existing structures (unchanged)

```
game.players   { [numericKey]: { id, name, hand, sum, score } }
game.eliminated  [{ id, name, score }]   — appended each round
game.game_state  { deck, top_card, current_turn }
rooms[room]    { [socketId]: { id, name, playerType } }
readyPlayers[room]  Set<playerId>
readyTimers[room]   timeout handle
```

## Socket event payloads — changes

### gameOver (server → all)  — updated
```json
{
  "winner": { "id": 0, "name": "Alice" },
  "players": {
    "0": { "id": 0, "name": "Alice", "score": 45 }
  }
}
```
*(Game can only end with exactly one survivor — draws that leave multiple players continue to the next round.)*

### nextRound (server → all)  — no change
```json
{ "top_card": [...], "current_turn": 0, "deck": [...] }
```

### readyForNextRound (client → server)  — no change
*(no payload)*

## US3 (P2) — spectators
```
game.spectators  [{ id, name, socketId }]   — players eliminated and chose Watch
```

### spectatorJoin (client → server) — new
*(no payload — sender's socket identifies the player)*

Spectators receive `nextRound` and `turn` (public state) but never a `hand` event.
