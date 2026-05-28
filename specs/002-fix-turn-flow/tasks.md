# Tasks: Fix Atomic Turn Flow

**Spec**: [spec.md](spec.md)
**Branch**: `002-fix-turn-flow`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (no dependencies)
- **[Story]**: User story this task belongs to

---

## Phase 1: Foundational — Understand Current Flow

- [x] T001 Read `server/socket.js` lines 78–128 to confirm the three separate `cardFromHand` / `cardFromDeck` / `cardFromTop` handlers and the out-of-turn guard
- [x] T002 Read `client/src/pages/game/index.jsx` lines 17–137 to confirm `makeTurn`, `drawFromDeck`, and `drawFromTop` send two separate socket events each

---

## Phase 2: Test Setup (required before writing tests)

- [x] T003 Install Jest and socket.io-client as dev dependencies in `server/`: `npm install --save-dev jest socket.io-client`
- [x] T004 Add `"test": "jest"` script to `server/package.json`
- [x] T005 Create `server/tests/` directory and `server/tests/helpers/setup.js` — exports a `createTestServer()` helper that spins up the Express+Socket.io server on a random port and returns `{ httpServer, io, port }` for use in tests

---

## Phase 3: User Story 1 — Atomic Discard + Draw (Priority: P1)

**Goal**: Discard and draw happen in a single socket event so there is no intermediate state.

**Independent Test**: Player selects a card, clicks DECK — hand size stays the same (one removed, one added) and the discarded card appears on top of the discard pile in a single update.

### Tests — write FIRST, verify they FAIL before implementation

- [x] T006 [P] [US1] Create `server/tests/turnFlow.test.js` — test: drawing from deck with selected cards discards the card AND adds a drawn card in one `hand` event (hand size unchanged, top card updated)
- [x] T007 [P] [US1] In `server/tests/turnFlow.test.js` — test: drawing from top card with selected cards discards and draws atomically
- [x] T008 [P] [US1] In `server/tests/turnFlow.test.js` — test: clicking draw with NO selected cards emits an error and does NOT change game state
- [x] T009 [P] [US1] In `server/tests/turnFlow.test.js` — test: out-of-turn draw attempt is rejected and game state unchanged

### Server changes — `server/socket.js`

- [x] T010 [US1] Replace the separate `cardFromHand` + `cardFromDeck` handlers with a single `cardFromDeck` handler that calls `makeTurnCardFromHand` (discard) then `drawFromDeck` (draw) in sequence, then emits `hand` and `turn` once
- [x] T011 [US1] Replace the separate `cardFromHand` + `cardFromTop` handlers with a single `cardFromTop` handler that calls `makeTurnCardFromHand` (discard) then `drawTopCard` (draw) in sequence, then emits `hand` and `turn` once
- [x] T012 [US1] In both new handlers, add a guard: if `turn_data.selected_cards` is empty or missing, emit an error event back to the socket and return early
- [x] T013 [US1] Remove the standalone `cardFromHand` handler from `server/socket.js`

### Client changes — `client/src/pages/game/index.jsx`

- [x] T014 [US1] Rewrite `drawFromDeck` to emit a single `makeTurn` event with `type: "cardFromDeck"` and `selected_cards: selectedCards`, then call `setSelectedCards([])` — remove the separate `makeTurn()` call
- [x] T015 [US1] Rewrite `drawFromTop` to emit a single `makeTurn` event with `type: "cardFromTop"`, `side`, and `selected_cards: selectedCards`, then call `setSelectedCards([])` — remove the separate `makeTurn()` call

### Verify tests pass

- [x] T016 [US1] Run `npm test` in `server/` — all 4 tests in `turnFlow.test.js` must pass

**Checkpoint**: Select a card → click DECK: hand size unchanged, discarded card on top of pile. Out-of-turn click: error emitted, no state change. All tests green.

---

## Phase 4: Polish

- [x] T017 Remove leftover `makeTurn` function from `client/src/pages/game/index.jsx` if no longer called
- [x] T018 Remove the unused `hasEmittedTurn` ref from `client/src/pages/game/index.jsx` lines 10–11

---

## Dependencies & Execution Order

- T001–T002: Reads, run together first
- T003–T005: Test setup must complete before writing any tests
- T006–T009: Write tests BEFORE implementation (they must fail first)
- T010–T013: Server implementation (after tests are written and failing)
- T014–T015: Client implementation (parallel with server changes, different files)
- T016: Run after T010–T015 all complete
- T017–T018: Last, cleanup only

---

## Parallel Opportunities

```
T001, T002 — reads, run together
T006, T007, T008, T009 — all in same test file but independent test cases
T010, T011 — different handlers, can be written in parallel
T014, T015 — different client functions, can be written in parallel
T017, T018 — independent cleanup
```
