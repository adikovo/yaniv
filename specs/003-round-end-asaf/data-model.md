# Data Model: Round End Event & Asaf Detection

## Modified Entities

### Player (existing — extended)

```js
{
  id: Number,
  name: String,
  playerType: 'host' | 'join',
  hand: Card[],
  sum: Number,
  score: Number   // NEW — cumulative score across rounds, starts at 0
}
```

### RoundResult (new — returned by yanivCall, used in roundEnd payload)

```js
{
  winner: Player,          // player object who won the round
  asaf: Boolean,           // true if Asaf was triggered
  asafCaller: Player|null  // the player who called Yaniv and got penalised, or null
}
```

## Socket Event Payloads

### `roundEnd` (server → all clients)

```js
{
  winner: { id, name },
  asaf: Boolean,
  asafCaller: { id, name } | null,
  players: {
    [playerId]: {
      hand: Card[],
      sum: Number,
      score: Number
    }
  }
}
```

### `nextRound` (server → all clients)

```js
{
  top_card: Card[],
  current_turn: Number,
  deck: Card[]
}
// + individual `hand` events per socket (same as startGame)
```

### `gameOver` (server → all clients)

```js
{
  reason: String  // e.g. "not enough players"
}
```

## State Transitions

```
IN_ROUND
  → yaniv called
  → resolveRound (yanivCall mutates scores)
  → emit roundEnd
  → ROUND_END_SCREEN (15s timer starts)
    → players click readyForNextRound
    → timer fires
      → eliminatePlayers (score > 100 removed, non-ready removed)
      → if ≥ 2 players: re-deal → emit nextRound → IN_ROUND
      → if < 2 players: emit gameOver → GAME_OVER
```
