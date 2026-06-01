# Research: Scoring System

## Finding 1 — Score accumulation already partially implemented

- **Decision**: Build on existing `yanivCall` in `server/gameLogic.js` (lines 104–136)
- **Current state**: `p.score = (p.score || 0) + p.sum` already runs for all non-callers; halving at 100 → 50 is correct; halving at 50 → **0** is a bug (should be 25)
- **Action**: Fix line 132: `else if (p.score === 50) p.score = 0;` → `else if (p.score === 50) p.score = 25;`

## Finding 2 — Eliminated players are deleted, losing their data

- **Decision**: Introduce `game.eliminated[]` to preserve eliminated players for scoreboard display
- **Rationale**: `eliminatePlayers()` currently does `delete game.players[key]` — the player object is lost before `roundEnd` is emitted and cannot be shown on the scoreboard
- **Alternatives considered**: `eliminated: true` flag on player object — rejected because `dealCards` and `nextTurn` iterate `game.players`; keeping eliminated players there would require guards everywhere; a separate array is simpler

## Finding 3 — `roundEnd` payload is missing eliminated player data

- **Decision**: Extend `roundEnd` to include an `eliminated` array alongside `players`
- **Current state**: `roundEnd` emits `players` (snapshot of active players) but eliminated players are already deleted at that point
- **Action**: Capture eliminated players in `eliminatePlayers()` return value and include in `roundEnd`

## Finding 4 — `eliminatePlayers` is called twice per round

- **Current state**: Called once in the `yaniv` handler (after `yanivCall`), then again in `readyForNextRound` (after score-based removal). The second call is a safety net for players who scored > 100 after the round. This is intentional but means `game.eliminated` must be appended to, not replaced.

## Finding 5 — Winner in asaf also gets score added (pre-existing behaviour)

- **Decision**: Leave as-is; not in scope for this feature
- **Current code**: The asaf `winner` (non-caller with lowest hand) has their `sum` added via the generic non-caller loop. Yaniv rules vary; this is existing product behaviour.

## Finding 6 — No client scoreboard UI exists yet

- **Decision**: Add a scoreboard component to the `RoundResult` dialog (already shown after each round)
- **Rationale**: The `round-result` component at `client/src/components/round-result/index.jsx` is the natural place; avoids a new page/route; fits the existing post-round flow
