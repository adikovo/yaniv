# Tasks: Round End Event & Asaf Detection

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Tests**: [tests.md](tests.md)
**Branch**: `003-round-end-asaf`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (no dependencies)
- **[Story]**: User story this task belongs to

---

## Phase 1: Setup — Foundational Prerequisites

**Purpose**: Infrastructure required before any user story can be implemented.

- [x] T001 Add `score: 0` to each player object in `server/gameLogic.js` `dealCards` function
- [x] T002 Make the ready-up timeout injectable in `server/socket.js` — accept optional `readyTimeout` param (default 15000ms) so tests can pass 100ms

**Checkpoint**: Player objects have a `score` field. Timeout is testable without waiting 15 seconds.

---

## Phase 2: User Story 1 — Round Ends When Yaniv is Called (Priority: P1) 🎯 MVP

**Goal**: When Yaniv is called, all players receive a `roundEnd` event with the winner, scores, and Asaf flag.

**Independent Test**: Call Yaniv from player 0 — both clients receive `roundEnd` with correct winner, scores updated, Asaf flag set correctly.

### Tests — write FIRST, verify they FAIL before implementation

- [x] T003 [P] [US1] Write test T-A (normal Yaniv win) in `server/tests/roundEnd.test.js` — assert `roundEnd.winner.id === 0`, `players[1].score === their sum`, `asaf === false`
- [x] T004 [P] [US1] Write test T-B (Asaf — caller has higher sum) in `server/tests/roundEnd.test.js` — assert `asaf === true`, `players[0].score === 35`, `players[1].score === 4`
- [x] T005 [P] [US1] Write test T-C (Asaf — tied hand value) in `server/tests/roundEnd.test.js` — assert Asaf triggered when sums are equal
- [x] T006 [P] [US1] Write test T-D (multiple Asaf candidates, 3-player) in `server/tests/roundEnd.test.js` — assert lowest hand wins, caller gets sum+30, all others add their sum
- [x] T007 [P] [US1] Write test T-E (Asaf with caller sum = 0) in `server/tests/roundEnd.test.js` — assert penalty is exactly 30

### Implementation

- [x] T008 [US1] Modify `yanivCall(game)` in `server/gameLogic.js` — detect Asaf (any other player sum ≤ caller sum), update all player scores (normal: winner +0, others add sum; Asaf: caller adds sum+30, everyone else adds their sum), return `{ winner, asaf, asafCaller }`
- [x] T009 [US1] Add `eliminatePlayers(game)` to `server/gameLogic.js` — removes players with `score > 100`, returns array of eliminated player objects
- [x] T010 [US1] Modify `yaniv` handler in `server/socket.js` — call `yanivCall`, call `eliminatePlayers`, emit `roundEnd` to room with `{ winner, asaf, asafCaller, players: { [id]: { hand, sum, score } } }`
- [x] T011 [US1] Run `npm test` in `server/` — tests T-A through T-E must all pass

**Checkpoint**: Yaniv call → `roundEnd` emitted with correct scores and Asaf detection. All 5 server tests green.

---

## Phase 3: User Story 1 (continued) — Client Result Screen

**Goal**: All players see a result screen when `roundEnd` is received.

**Independent Test**: Open two browser tabs — call Yaniv — both tabs show result screen with winner name, Asaf label (if applicable), and each player's score.

- [ ] T012 [P] [US1] Create `client/src/components/round-result/index.jsx` — accepts `{ winner, asaf, asafCaller, players }` props, shows winner name, Asaf label if triggered, each player's hand cards and updated score
- [ ] T013 [P] [US1] Create `client/src/components/round-result/styles.css` — basic layout for result screen
- [ ] T014 [US1] Add `roundResult` state to `client/src/pages/game/index.jsx` — set it on `roundEnd` socket event, render `<RoundResult>` when state is set (replaces game UI)

**Checkpoint**: Result screen appears for all players after Yaniv is called.

---

## Phase 4: User Story 2 — Ready-Up & Next Round

**Goal**: Players click "Next Round" within 15 seconds to stay in the game. Round restarts with ready players. Non-clickers and eliminated players are dropped.

**Independent Test**: Two players see result screen — both click "Next Round" — new hand dealt, game resumes. One player doesn't click — after timeout they're removed.

### Tests — write FIRST, verify they FAIL before implementation

- [ ] T015 [P] [US2] Write test T-F (score exactly 100 — NOT eliminated) in `server/tests/roundEnd.test.js` — assert player stays in `game.players`
- [ ] T016 [P] [US2] Write test T-G (score over 100 — eliminated) in `server/tests/roundEnd.test.js` — assert player removed from `game.players`
- [ ] T017 [P] [US2] Write test T-H (both players ready — round restarts) in `server/tests/roundEnd.test.js` — assert both receive `nextRound` and a new `hand` event with 5 cards (use 100ms timeout)
- [ ] T018 [P] [US2] Write test T-I (one player ready, one not — gameOver) in `server/tests/roundEnd.test.js` — assert non-clicker removed, `gameOver` emitted (use 100ms timeout)
- [ ] T019 [P] [US2] Write test T-J (double click idempotent) in `server/tests/roundEnd.test.js` — assert no crash, player counted once

### Implementation

- [ ] T020 [US2] Add `readyForNextRound` socket handler in `server/socket.js` — tracks ready players per room in a `readyPlayers` map, starts a one-shot `setTimeout` on first click, fires once per round
- [ ] T021 [US2] On timeout in `server/socket.js`: remove non-ready players from `game.players`, call `eliminatePlayers`, then if ≥ 2 players remain re-deal (`createDeck`, `shuffleDeck`, `dealCards`, `whosTurn`, `topCard`) and emit `nextRound` + individual `hand` events; else emit `gameOver`
- [ ] T022 [US2] Run `npm test` in `server/` — all 10 tests (T-A through T-J) must pass

**Checkpoint**: Ready-up works. Round restarts or gameOver fires correctly. All 10 server tests green.

---

## Phase 5: User Story 2 (continued) — Client Ready-Up UI

**Goal**: "Next Round" button with 15-second countdown visible on result screen.

- [ ] T023 [P] [US2] Add "Next Round" button with 15s visual countdown to `client/src/components/round-result/index.jsx` — button emits `readyForNextRound` once on click, disables after click
- [ ] T024 [P] [US2] Wire `nextRound` event in `client/src/pages/game/index.jsx` — update `gameState` with new top card / turn, update `player.hand`, clear `roundResult` state (hides result screen)
- [ ] T025 [US2] Wire `gameOver` event in `client/src/pages/game/index.jsx` — show a simple game over message or navigate away

**Checkpoint**: Full round cycle works end-to-end in browser.

---

## Phase 6: Polish

- [ ] T026 Export `eliminatePlayers` from `server/gameLogic.js` module.exports
- [ ] T027 Run full `npm test` in `server/` — all tests green
- [ ] T028 [P] Remove `readyPlayers` map entries for a room when the room is cleaned up in the `disconnect` handler in `server/socket.js`

---

## Dependencies & Execution Order

- T001–T002: Must complete before any other task
- T003–T007: Write all tests in parallel before T008 (TDD red phase)
- T008–T010: Sequential — gameLogic before socket handler
- T011: After T008–T010
- T012–T013: Parallel, after T011
- T014: After T012–T013
- T015–T019: Write in parallel before T020 (TDD red phase)
- T020–T021: Sequential
- T022: After T020–T021
- T023–T025: Parallel client tasks, after T022
- T026–T028: Polish, last

---

## Parallel Opportunities

```
T003, T004, T005, T006, T007 — all test files, write together
T012, T013 — different files
T015, T016, T017, T018, T019 — all test cases, write together
T023, T024, T025 — different client concerns
```

---

## Implementation Strategy

### MVP (US1 only — Phases 1–3)

1. T001–T002: Setup
2. T003–T007: Write failing tests
3. T008–T011: Server implementation + green tests
4. T012–T014: Client result screen
5. **STOP**: Validate Yaniv call → result screen appears for all players

### Full Delivery

Continue with Phases 4–6 for ready-up, next round, and game over.
