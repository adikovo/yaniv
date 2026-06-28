---

description: "Task list for Lobby Leave/Disconnect Broadcast"
---

# Tasks: Lobby Leave/Disconnect Broadcast

**Input**: Design documents from `/specs/015-lobby-leave-broadcast/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (user stories), [research.md](research.md)

**Tests**: Included — this is a server-side behavioral fix and the project follows TDD (failing Jest test before implementation).

**Organization**: Tasks are grouped by user story. Note: the production change is a single shared branch in `removePlayer`, so US1's implementation task also satisfies US2 — US2's phase is its own failing test that the shared change turns green.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- All test tasks below live in the **same** new file (`server/tests/lobbyLeave.test.js`), so they are **not** mutually `[P]`.

## Path Conventions

Web app, **server package only**: production code in `server/`, Jest tests in `server/tests/`. No client changes.

---

## Phase 1: Setup

**Purpose**: Scaffold the single new test file against the existing Socket.io harness.

- [x] T001 Create `server/tests/lobbyLeave.test.js` with the Jest scaffold: import `createTestServer` from `./helpers/setup`, import `games` from `../globals`, a `describe('Lobby leave/disconnect broadcast')` block, and a `beforeEach` that spins up a 3-player server and forces the **pre-start** state via `delete games[gameID].game_state` (the helper seeds a started game). Add `afterEach(closeServer)`.

---

## Phase 2: Foundational

**Purpose**: None required. The fix is a single-function change with no shared prerequisites beyond the test scaffold (Phase 1).

**Checkpoint**: Test scaffold ready — user story work can begin.

---

## Phase 3: User Story 1 - Leave updates remaining lobby rosters (Priority: P1) 🎯 MVP

**Goal**: When a player clicks Leave Lobby pre-start, every remaining waiting player's roster updates to drop the leaver.

**Independent Test**: Three clients join a pre-start room; one emits `leaveRoom`; the other two receive a `playersUpdate` whose `players` excludes the leaver.

### Tests for User Story 1 (write first; MUST FAIL before T004)

- [x] T002 [US1] In `server/tests/lobbyLeave.test.js`, add a failing test: 3 clients connected to the pre-start room; `client2.emit('leaveRoom')`; assert `client0` (and/or `client1`) receives `playersUpdate` whose `players` array excludes the leaver and has length 2.
- [x] T003 [US1] In `server/tests/lobbyLeave.test.js`, add a failing test asserting **no spurious event**: on the same pre-start `leaveRoom`, a remaining client does **not** receive `gameOver` (register a `gameOver` listener that fails the test if called; use a short timeout / the `playersUpdate` arrival to end the test).

### Implementation for User Story 1

- [x] T004 [US1] In `server/socket.js`, add the pre-start branch to `removePlayer` (around the gate at line 263, after `cleanupRoomIfEmpty` returns false): when `games[room] && !games[room].game_state`, `delete games[room].players[player.id]` (guarded by `player`), `io.to(room).emit("playersUpdate", { players: Object.values(rooms[room]) })`, then `return player`. Leave the existing in-game block unchanged (it now runs only when `game_state` exists). Turns T002 + T003 green.

**Checkpoint**: US1 fully functional — pre-start leave updates remaining rosters with no spurious `gameOver`.

---

## Phase 4: User Story 2 - Disconnect updates remaining lobby rosters (Priority: P2)

**Goal**: When a player disconnects pre-start, every remaining waiting player's roster updates to drop them.

**Independent Test**: Three clients join a pre-start room; one disconnects; the other two receive a `playersUpdate` excluding the disconnected player.

### Tests for User Story 2 (write first)

- [x] T005 [US2] In `server/tests/lobbyLeave.test.js`, add a test: 3 clients connected to the pre-start room; `client2.disconnect()`; assert a remaining client receives `playersUpdate` whose `players` excludes the disconnected player and has length 2. (This passes once T004 is in, since `removePlayer` backs both `leaveRoom` and `disconnect`; the test confirms the disconnect path explicitly.)

**Checkpoint**: US1 and US2 both verified independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T006 In `server/tests/lobbyLeave.test.js`, add an **in-game regression guard** (locks FR-006): with `game_state` present (do NOT delete it — use the helper's default started game), a `disconnect` still emits `playerDisconnected` (and `gameOver` when one player remains), proving the post-start path is unchanged.
- [x] T007 In `server/tests/lobbyLeave.test.js`, add an **edge case** test: the last player leaving an otherwise-empty pre-start room cleans up the room (no error thrown, no broadcast needed) — assert `rooms`/`games` no longer hold the room (or simply that no exception occurs and no `playersUpdate` is delivered to anyone).
- [x] T008 Run the full server suite (`cd server && npm test`) and confirm all tests pass, including the existing `disconnect.test.js`.
- [x] T009 Mark the feature complete: tick the boxes in this file and prepare the PR (server-only change + new test file).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1, T001)**: start immediately; blocks all test tasks (they share the file/scaffold).
- **US1 (Phase 3)**: after T001. T002, T003 (tests) before T004 (impl).
- **US2 (Phase 4)**: after T001; T005 is best verified after T004 (the shared implementation).
- **Polish (Phase 5)**: after T004 (T006–T007 exercise both branches; T008 runs everything).

### Within Each User Story

- Tests written and failing before implementation (T002, T003 → T004).
- US2's test (T005) green via the shared T004 change.

### Parallel Opportunities

- Limited: all tests live in one file (`server/tests/lobbyLeave.test.js`), so test tasks are sequential, not `[P]`. There is a single production file (`server/socket.js`) and a single test file, so no cross-file parallelism applies.

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 (scaffold) → T002, T003 (failing tests) → T004 (implementation) → tests green.
2. **STOP and VALIDATE**: pre-start leave updates remaining rosters; no spurious `gameOver`.

### Incremental

3. T005 confirms the disconnect path (US2).
4. T006–T007 lock the in-game regression guard and the empty-room edge case.
5. T008 full suite green → T009 PR.

---

## Notes

- Single production change: the pre-start branch in `removePlayer` (`server/socket.js`). No client change — the lobby already re-renders from `playersUpdate`.
- Pre-start state in tests is forced by `delete games[gameID].game_state` because `createTestServer` seeds a started game.
- Reuse the existing `playersUpdate` event and `{ players: Object.values(rooms[room]) }` payload (parity with the join handler at `server/socket.js:40`).
- Commit after the green MVP (T004) and again after polish; user runs git.
