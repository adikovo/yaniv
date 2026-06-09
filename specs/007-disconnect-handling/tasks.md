# Tasks: Player Disconnect Handling & Turn Rotation Fix

**Input**: Design documents from `/specs/007-disconnect-handling/`

**Prerequisites**: plan.md ✅, spec.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — Fix `nextTurn` (Blocking Prerequisite)

**Purpose**: The corrected turn rotation logic underpins all three user stories. It must be in place before any disconnect or elimination scenario can be correctly handled.

**⚠️ CRITICAL**: All user story phases depend on this fix.

- [x] T001 Add `getNextPlayerId(game)` helper to `server/gameLogic.js` — returns the next active player ID by iterating sorted `Object.keys(game.players)` numerically, wrapping around correctly for any non-contiguous ID set
- [x] T002 Refactor `nextTurn(game)` in `server/gameLogic.js` to use `getNextPlayerId` instead of modulo-on-count
- [x] T003 Export `getNextPlayerId` from `server/gameLogic.js` module.exports

**Checkpoint**: `nextTurn` now works correctly when players 0, 1, 2 exist and player 1 is removed — turn advances from 0 to 2, and from 2 back to 0.

---

## Phase 2: User Story 1 — Game Continues After Mid-Round Disconnect (P1) 🎯 MVP

**Goal**: When a player disconnects in a 3+ player game, the remaining players can continue playing the current round without the game freezing.

**Independent Test**: Start a 3-player game, disconnect one player mid-round. The remaining two players can take turns and finish the round normally.

- [x] T004 [US1] In the `disconnect` handler in `server/socket.js`, after removing the player from `rooms[room]`, also delete them from `games[room].players` if a game is in progress
- [x] T005 [US1] Emit a `playerDisconnected` event to the room with `{ name: player.name, id: player.id }` after removing the player from game state in `server/socket.js`
- [x] T006 [US1] After removing the player, check if it was their turn (`games[room].game_state.current_turn === disconnectedPlayer.id`); if so, call `nextTurn(games[room])` in `server/socket.js`
- [x] T007 [US1] After advancing the turn (if needed), emit a `turn` event to the room with the updated `current_turn`, `top_card`, and `deck` in `server/socket.js`
- [x] T008 [P] [US1] Add a `playerDisconnected` listener on the client in `client/src/` (whichever component handles game state) that displays "[Name] has left the game" as a notification

**Checkpoint**: In a 3-player game, disconnecting one player mid-round lets the other two continue. The UI shows who left and the correct player's turn is shown.

---

## Phase 3: User Story 2 — Game Ends When Only One Player Remains (P1)

**Goal**: If a disconnect reduces the active player count to 1, the game ends immediately with that player as the winner.

**Independent Test**: Start a 2-player game, disconnect one player. The remaining player sees the game-over screen declaring them the winner.

- [x] T009 [US2] In the disconnect handler in `server/socket.js`, after removing the disconnected player and emitting `playerDisconnected`, check the remaining player count in `games[room].players`
- [x] T010 [US2] If exactly 1 player remains, emit `gameOver` with `{ winner: { id, name } }` to the room in `server/socket.js`
- [x] T011 [US2] If 0 players remain (all disconnected simultaneously), skip `nextTurn` and `gameOver` — just clean up silently in `server/socket.js`
- [x] T012 [US2] Guard the turn-advance logic (T006–T007) so it only runs when 2+ players remain — it must not fire after a `gameOver` has been emitted in `server/socket.js`

**Checkpoint**: A 2-player game where one player disconnects shows the game-over screen on the remaining client. A 3-player game where one disconnects does NOT trigger game-over and instead continues (US1 checkpoint still passes).

---

## Phase 4: User Story 3 — Correct Turn Rotation With Non-Contiguous IDs (P1)

**Goal**: Turn advancement must work correctly after any player removal — whether by score elimination at round end or mid-round disconnect — for any combination of remaining player IDs.

**Independent Test**: In a 3-player game (IDs 0, 1, 2), eliminate player 1 via score. Confirm turns cycle between 0 and 2 only, with no undefined lookups or skipped turns.

- [x] T013 [US3] Verify `eliminatePlayers` in `server/gameLogic.js` removes players from `game.players` by key — confirm the existing deletion (`delete game.players[key]`) leaves the remaining keys intact (no re-indexing needed)
- [x] T014 [US3] Verify `nextTurn` (now using `getNextPlayerId` from Phase 1) correctly handles the post-elimination ID set `{0, 2}` — manual trace: from 0 → next is 2; from 2 → next is 0
- [x] T015 [US3] Add a guard in `nextTurn` in `server/gameLogic.js`: if `Object.keys(game.players).length === 0`, return early without updating `current_turn` to avoid a crash on empty player sets

**Checkpoint**: After player 1 is eliminated (IDs `{0, 2}`), calling `nextTurn` from player 0 sets `current_turn` to 2. Calling it again sets it back to 0. No undefined lookups.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Update `server/socket.js` import line to include `getNextPlayerId` if it ends up being needed directly in socket.js (it may only be needed inside `gameLogic.js`)
- [ ] T017 Review the `makeTurn` guard in `server/socket.js` (`if socketPlayer.id !== getCurrentPlayer(games[room]).id`) — ensure it handles `getCurrentPlayer` returning `undefined` gracefully when the current player has been removed mid-turn
- [ ] T018 Manual end-to-end test: 3-player game → disconnect mid-round → confirm remaining 2 finish round → new round starts correctly with winner going first

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 (T001–T003)
- **Phase 3 (US2)**: Depends on Phase 2 (T004–T008)
- **Phase 4 (US3)**: Depends on Phase 1 (T001–T003); can run in parallel with Phase 2/3 since it only touches `gameLogic.js`
- **Phase 5 (Polish)**: Depends on all prior phases

### Parallel Opportunities

- T004–T007 (server socket.js) and T008 (client listener) can run in parallel — different files, no conflict
- T013–T015 (Phase 4) can start as soon as Phase 1 is done, independently of Phase 2/3

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 (fix `nextTurn`) — this is the root fix
2. Complete Phase 2 (US1: game continues after disconnect)
3. **Validate**: 3-player game, disconnect mid-round, confirm play continues
4. Complete Phase 3 (US2: game ends at 1 player)
5. **Validate**: 2-player game, disconnect, confirm game-over
6. Complete Phase 4 (US3: verify elimination case is also fixed)
7. Complete Phase 5 (polish)
