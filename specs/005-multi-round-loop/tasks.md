---
description: "Task list for Multi-Round Loop implementation"
---

# Tasks: Multi-Round Loop

**Input**: Design documents from `/specs/005-multi-round-loop/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/socket-events.md

**Tests**: Server tasks follow TDD (write failing test → confirm red → implement → green). Client has no test suite — verified manually.

**Organization**: Tasks grouped by user story. US1 (auto-advance loop) is the MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3

---

## Phase 1: Setup

**Purpose**: No new infrastructure needed — existing server/client structure is reused.

- [x] T001 Confirm `server/tests/` runs green before changes: `cd server && npm test`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the old acknowledgement-based round flow so the new auto-advance loop can be built cleanly.

**⚠️ CRITICAL**: Must complete before US1.

- [x] T002 Remove `readyPlayers`, `readyTimers` module state and the entire `readyForNextRound` socket handler (incl. nested `resolveRound`) from [server/socket.js](../../server/socket.js)
- [x] T003 Remove `readyForNextRound` cleanup from the `disconnect` handler in [server/socket.js](../../server/socket.js)

**Checkpoint**: Server no longer waits for acknowledgement; round loop is ready to be rebuilt.

---

## Phase 3: User Story 1 — Auto-Advance Round with YANIV Overlay (Priority: P1) 🎯 MVP

**Goal**: After Yaniv, broadcast `roundEnd`, wait ~2 s, then auto-deal the next round. Client shows a non-blocking "YANIV!" overlay that clears on `nextRound`.

**Independent Test**: Player calls Yaniv → "YANIV!" appears ~2 s → all players get new hands and the board resets, no button press.

### Tests for User Story 1 (write first, confirm red) ⚠️

- [ ] T004 [US1] Write failing test T-MR1 in [server/tests/multiRound.test.js](../../server/tests/multiRound.test.js): yaniv call → `roundEnd` fires → within ~2 s both clients receive `nextRound` and a fresh `hand` event
- [ ] T005 [US1] Write failing test T-MR2 in [server/tests/multiRound.test.js](../../server/tests/multiRound.test.js): after auto-advance, `game_state` is fully reset (new deck length, new single top card)

### Implementation for User Story 1

- [ ] T006 [US1] In the `yaniv` handler in [server/socket.js](../../server/socket.js), after emitting `roundEnd`: if ≥ 2 active players remain, schedule `setTimeout(() => dealNewRound(room, "nextRound"), 2000)`
- [ ] T007 [US1] Run `cd server && npm test` — confirm T-MR1 and T-MR2 go green
- [ ] T008 [P] [US1] Create non-blocking overlay component [client/src/components/yaniv-overlay/index.jsx](../../client/src/components/yaniv-overlay/index.jsx) + styles.css: shows "YANIV!" + caller name + round scores, positioned over the board
- [ ] T009 [US1] In [client/src/pages/game/index.jsx](../../client/src/pages/game/index.jsx): on `roundEnd` store result in a `yanivResult` state to render `<YanivOverlay>`; clear it on `nextRound`; remove the per-round `<RoundResult>` render
- [ ] T010 [US1] Remove the DEBUG score button from [client/src/pages/game/index.jsx](../../client/src/pages/game/index.jsx) and the `debugSetScore` handler from [server/socket.js](../../server/socket.js)

**Checkpoint**: Full round loop works automatically with the YANIV overlay. MVP complete.

---

## Phase 4: User Story 2 — Game Over + Rematch (Priority: P1)

**Goal**: When one player remains, emit `gameOver` with winner + final scores. The `RoundResult` modal is repurposed as the game-over screen with a "Rematch" button that resets scores and starts a fresh game.

**Independent Test**: Eliminate all but one player → game-over screen shows the winner and final scores → all players click Rematch (or 10 s timeout) → fresh game starts with scores reset.

### Tests for User Story 2 (write first, confirm red) ⚠️

- [ ] T011 [US2] Write failing test T-MR3 in [server/tests/multiRound.test.js](../../server/tests/multiRound.test.js): when scoring leaves 1 survivor, `gameOver` payload contains `winner.name` and a `players` map with final scores (no `nextRound` fires)
- [ ] T012 [US2] Write failing test T-MR4 in [server/tests/multiRound.test.js](../../server/tests/multiRound.test.js): after `gameOver`, both clients emit `rematchReady` → `start` fires, all scores reset to 0, `game.eliminated` cleared

### Implementation for User Story 2

- [ ] T013 [US2] In the `yaniv` handler in [server/socket.js](../../server/socket.js): when only 1 active player remains after elimination, emit `gameOver` with `{ winner: { id, name }, players: { [key]: { id, name, score } } }` instead of scheduling `nextRound`
- [ ] T014 [US2] Add a `rematchReady` socket handler in [server/socket.js](../../server/socket.js): ready-set + 10 s timeout; on resolve reset `game.eliminated = []`, set every player `score = 0`, then `dealNewRound(room, "start")`
- [ ] T015 [US2] Run `cd server && npm test` — confirm T-MR3 and T-MR4 go green
- [ ] T016 [US2] Add `gameOverData` state to [client/src/context/game-context.jsx](../../client/src/context/game-context.jsx)
- [ ] T017 [US2] In [client/src/pages/game/index.jsx](../../client/src/pages/game/index.jsx): replace the bare `gameOver` boolean with `gameOverData` (winner + players); render `<RoundResult isGameOver ... />` when set
- [ ] T018 [US2] In [client/src/components/round-result/index.jsx](../../client/src/components/round-result/index.jsx): add `isGameOver` prop — heading "Game Over — {winner.name} wins!", button label "Rematch" emitting `rematchReady`, keep the 10 s countdown

**Checkpoint**: Game reaches a winner, shows the game-over screen, and rematch starts a fresh game.

---

## Phase 5: User Story 3 — Eliminated Player Spectator Mode (Priority: P2)

**Goal**: An eliminated player chooses Leave (→ home) or Watch (read-only board). Spectators keep receiving public state but no hand, and can Exit any time.

**Independent Test**: Eliminate a player → Leave/Watch dialog appears → Watch shows a read-only board (no hand, no buttons) with an Exit button → Exit returns home.

### Tests for User Story 3 (write first, confirm red) ⚠️

- [ ] T019 [US3] Write failing test T-MR5 in [server/tests/multiRound.test.js](../../server/tests/multiRound.test.js): after a player is eliminated and emits `spectatorJoin`, they are in `game.spectators`, their socket stays in the room, and they receive `nextRound` but no `hand`

### Implementation for User Story 3

- [ ] T020 [US3] Add a `spectatorJoin` handler in [server/socket.js](../../server/socket.js): push `{ id, name, socketId }` into `game.spectators` (init `[]` if absent); keep the socket in the room
- [ ] T021 [US3] In `dealNewRound` in [server/socket.js](../../server/socket.js): emit `hand` only to sockets whose player is in `game.players` (spectators get the public `nextRound` broadcast but no `hand`)
- [ ] T022 [US3] Run `cd server && npm test` — confirm T-MR5 goes green
- [ ] T023 [P] [US3] Create [client/src/components/spectator-prompt/index.jsx](../../client/src/components/spectator-prompt/index.jsx) + styles.css: Leave / Watch dialog
- [ ] T024 [US3] Add `isSpectator` state to [client/src/context/game-context.jsx](../../client/src/context/game-context.jsx)
- [ ] T025 [US3] In [client/src/pages/game/index.jsx](../../client/src/pages/game/index.jsx): when the YANIV overlay clears and the local player is in `roundEnd.eliminated`, show `<SpectatorPrompt>`; Leave → navigate home; Watch → emit `spectatorJoin` and set `isSpectator`
- [ ] T026 [US3] In [client/src/pages/game/index.jsx](../../client/src/pages/game/index.jsx): when `isSpectator`, render a read-only board (no hand section, no action buttons) with an always-visible Exit button that navigates home

**Checkpoint**: Eliminated players can watch or leave; spectators see live public state only.

---

## Phase 6: Polish

- [ ] T027 Manual end-to-end check: 3-player game → rounds auto-advance with overlay → eliminate one (Watch) → eliminate down to 1 → game-over → rematch resets and replays
- [ ] T028 Remove any now-unused round-result/eliminated wiring left over from the old flow in [client/src/context/game-context.jsx](../../client/src/context/game-context.jsx)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational; shares the `yaniv` handler with US1 → do US1 first
- **US3 (Phase 5)**: depends on Foundational + US1 (needs the auto-advance loop and `roundEnd.eliminated`)
- **Polish (Phase 6)**: after US1 + US2 + US3

### Within Each Story

- Server tests written and failing before implementation (TDD)
- Server changes before client changes that depend on new events

### Parallel Opportunities

- T008 (overlay) and T023 (spectator prompt) are [P] — independent new component files
- US2 client tasks T016–T018 touch different files and can overlap once T013–T014 land

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1
2. **STOP and VALIDATE**: rounds auto-advance with the YANIV overlay
3. Demo

### Incremental Delivery

1. US1 → auto-advance loop (MVP)
2. US2 → game-over + rematch
3. US3 → eliminated-player spectator mode

---

## Notes

- [P] = different files, no dependencies
- Server TDD: confirm red before green (per project convention)
- After each phase: short summary + commit message; mark tasks [x] here as completed
- Commit after each logical group
