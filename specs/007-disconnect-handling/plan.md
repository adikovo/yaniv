# Implementation Plan: Player Disconnect Handling & Turn Rotation Fix

**Branch**: `007-disconnect-handling` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

## Summary

Fix two related bugs in the Yaniv server: (1) the game stalls when a player disconnects because the disconnect handler doesn't remove them from `game.players` or advance the turn; (2) `nextTurn` in `gameLogic.js` uses modulo on player count which produces wrong indices when player IDs are non-contiguous after any removal (disconnect or elimination). Both fixes live entirely on the server side — no client changes are needed beyond receiving one new socket event (`playerDisconnected`).

## Technical Context

**Language/Version**: Node.js (CommonJS)

**Primary Dependencies**: Express, Socket.io

**Storage**: In-memory game state (`globals.js`)

**Testing**: Manual / existing test structure in `server/tests/`

**Target Platform**: Node.js server process

**Project Type**: Real-time multiplayer game server

**Constraints**: Game state is in-memory; no persistence layer. All fixes must be non-destructive to existing socket event contracts.

## Project Structure

### Documentation (this feature)

```text
specs/007-disconnect-handling/
├── plan.md       ← this file
├── spec.md
└── tasks.md
```

### Source Code (affected files)

```text
server/
├── gameLogic.js   ← fix nextTurn(); add getNextPlayerId() helper
└── socket.js      ← extend disconnect handler
```

## Key Design Decisions

### `nextTurn` fix strategy
Replace the modulo-on-count approach with a function that finds the next valid player ID by iterating over `Object.keys(game.players)` sorted numerically. This handles any non-contiguous ID set and is also safe when all remaining IDs happen to be contiguous.

```
getNextPlayerId(game):
  keys = Object.keys(game.players).map(Number).sort()
  current = game.game_state.current_turn
  idx = keys.indexOf(current)
  return keys[(idx + 1) % keys.length]
```

`nextTurn` then calls `getNextPlayerId` and updates `current_turn`.

### Disconnect handler additions (in `socket.js`)
On disconnect, if a game is in progress for the player's room:
1. Remove the player from `game.players`.
2. Emit `playerDisconnected` to the room with the player's name.
3. Check remaining player count:
   - **0 players**: clean up silently (everyone left).
   - **1 player**: emit `gameOver` with that player as winner.
   - **2+ players**: if it was the disconnected player's turn, call `nextTurn`.  
     Then emit `turn` so clients update the board.
4. If a `dealNewRound` timeout is pending when the disconnect happens, it will naturally skip the missing player because they've already been removed from `game.players` before the timeout fires.

### Client-side (`playerDisconnected` event)
The client should display a toast/message that "[Name] has left the game." The existing `message` event already handles this for the chat — we can reuse it or add a dedicated event. We'll reuse the existing `message` broadcast (already in the disconnect handler) and add the structural `playerDisconnected` event for game-state updates.
