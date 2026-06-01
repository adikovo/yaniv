# Tasks: Scoring System (Remaining Work)

**Branch**: `004-scoring-system`  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Scope**: FR-001 through FR-007 are already implemented. These tasks cover FR-008 and FR-009 only.

---

## Phase 1: Server — Eliminated Player Tracking (FR-008)

**Goal**: Preserve eliminated players and include them in the `roundEnd` payload.

**Independent Test**: Trigger elimination — `roundEnd.eliminated` contains that player's `id`, `name`, and `score`.

- [x] T001 [US3] Initialise `game.eliminated = []` when game is created in `server/socket.js`
- [x] T002 [US3] In `eliminatePlayers` in `server/gameLogic.js` — push `{ id, name, score }` to `game.eliminated` before deleting from `game.players`
- [x] T003 [US3] Add `eliminated: game.eliminated` to the `roundEnd` emit in `server/socket.js`
- [x] T004 [US3] Add test in `server/tests/roundEnd.test.js` — eliminated player appears in `roundEnd.eliminated` with correct `id`, `name`, and `score`

**Checkpoint**: `roundEnd` carries eliminated players; server tests pass.

---

## Phase 2: Client — Show Eliminated Players on Scoreboard (FR-009)

**Goal**: Round-result dialog shows eliminated players below active players with an "Eliminated" label.

**Independent Test**: Trigger elimination in-game — eliminated player appears on the round-result screen labelled as eliminated with their final score.

- [ ] T005 [US3] In `client/src/context/game-context.jsx` — store `eliminated` array from `roundEnd` event in context
- [ ] T006 [US3] In `client/src/components/round-result/index.jsx` — render eliminated players below the score list with an "Eliminated" label, using `eliminated` from context
- [ ] T007 [P] [US3] In `client/src/components/round-result/styles.css` — style eliminated player rows (greyed out)

**Checkpoint**: Round-result dialog shows active + eliminated players correctly.

---

## Dependencies

- T001 → T002 → T003 (must initialise before pushing, must push before emitting)
- T004 can run in parallel with T003
- T005 → T006 → T007 (context first, then component, style can parallel T006)
