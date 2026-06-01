# Socket Event Contracts: Scoring System

## Changed events

### `roundEnd` (server → client)

```ts
{
  winner:      { id: number, name: string },
  asaf:        boolean,
  asafCaller:  { id: number, name: string } | null,
  players: {                         // active players (not yet eliminated)
    [key: string]: {
      id: number, name: string,
      hand: Card[], sum: number,
      score: number
    }
  },
  eliminated: {                      // NEW — players eliminated this round
    id: number, name: string,
    score: number
  }[]
}
```

## Unchanged events

- `nextRound` / `start` — eliminated players absent from `game.players`, naturally excluded from deals and turn flow
- `hand`, `turn`, `gameOver` — no changes needed
