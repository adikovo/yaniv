# Tasks: Fix Card Values & Run Length

**Spec**: [spec.md](spec.md)
**Branch**: `001-card-values`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (no dependencies)
- **[Story]**: User story this task belongs to

---

## Phase 1: Foundational

**Purpose**: Locate and understand the code that needs to change before touching anything.

- [x] T001 Read `server/gameLogic.js` lines 1–30 to confirm `valueToNumber` map and `numeric_val` assignment for J/Q/K
- [x] T002 Read `server/gameLogic.js` lines 85–95 to confirm hand-sum logic for J/Q/K
- [x] T003 Read `server/gameLogic.js` lines 152–182 to confirm run validation logic and find where length check is (or isn't)

---

## Phase 2: User Story 1 — Face Cards Count as 10 (Priority: P1)

**Goal**: J, Q, K each have `numeric_val` of 10 so all hand-value calculations are correct.

**Independent Test**: Start a game, hold J+Q+K — hand value must equal 30.

- [x] T004 [US1] In `server/gameLogic.js`, change `valueToNumber` map: set `'J': 10`, `'Q': 10`, `'K': 10`
- [x] T005 [US1] In `server/gameLogic.js`, verify the `calculateHandSum` function uses `numeric_val` for J/Q/K (lines ~88–93) — remove any separate branch that adds 10 for face cards if `numeric_val` now already equals 10 (avoid double-counting)

**Checkpoint**: Hold J+Q+K in hand — server reports hand value = 30.

---

## Phase 3: User Story 2 — Minimum Run Length of 3 (Priority: P1)

**Goal**: The `validMove` function rejects runs of fewer than 3 cards.

**Independent Test**: Select 2 sequential same-suit cards and attempt to discard — server rejects the move.

- [x] T006 [US2] In `server/gameLogic.js` `validMove` function (line ~169), add a guard before the sequence check: if `sameSuit` is true and `selected_cards.length < 3`, return `false`

**Checkpoint**: 2-card same-suit sequence is rejected; 3-card same-suit sequence is accepted.

---

## Phase 4: Polish

- [x] T007 Remove debug `console.log` statements from `validMove` in `server/gameLogic.js` (lines ~159, 174, 179)

---

## Dependencies & Execution Order

- T001–T003: Read-only, run in any order before editing
- T004 must complete before T005 (T005 verifies no double-count after T004)
- T006 is independent of T004/T005
- T007 last

---

## Parallel Opportunities

```
T001, T002, T003 — all reads, run together
T004+T005 (US1) and T006 (US2) — different logic paths, can be done in parallel
T007 — cleanup, anytime after T006
```
