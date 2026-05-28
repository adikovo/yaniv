# Socket Event Contracts: Round End & Asaf

## Server → Client

### `roundEnd`
Emitted to all clients in the room when Yaniv is called and the round is resolved.

```js
{
  winner: { id: Number, name: String },
  asaf: Boolean,
  asafCaller: { id: Number, name: String } | null,
  players: {
    [playerId: String]: {
      hand: Card[],
      sum: Number,
      score: Number
    }
  }
}
```

### `nextRound`
Emitted to all clients after ready-up resolves with ≥ 2 players.

```js
{
  top_card: Card[],
  current_turn: Number,
  deck: Card[]
}
```
Each player also receives a `hand` event (same contract as `startGame`).

### `gameOver`
Emitted when fewer than 2 players remain after ready-up or elimination.

```js
{
  reason: String
}
```

---

## Client → Server

### `readyForNextRound`
Emitted when a player clicks "Next Round". No payload — room is inferred from the socket.

```js
// no payload
```
