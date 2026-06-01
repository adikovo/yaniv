# Feature Specification: Scoring System

**Feature Branch**: `004-scoring-system`

**Created**: 2026-05-26

**Status**: In Progress

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Scores Accumulate Across Rounds (Priority: P1) ✅ IMPLEMENTED

After each round, the losing players' hand values are added to their cumulative score. Scores persist for the duration of the game.

**Why this priority**: Without persistent scoring, no meaningful multi-round game is possible.

**Independent Test**: Play 3 rounds — verify each player's total equals the sum of their round losses.

**Acceptance Scenarios**:

1. **Given** a round ends, **When** scores are updated, **Then** each losing player's score increases by their hand's point value
2. **Given** a player wins the round with 0 points, **When** scores are updated, **Then** their score does not change
3. **Given** multiple rounds have been played, **When** scores are displayed, **Then** they reflect the correct cumulative total

**Implementation notes**: Score initialised to 0 in `routes/game.js`. `yanivCall` in `gameLogic.js` adds `p.sum` to all non-callers every round. `roundEnd` event already includes `score` per player.

---

### User Story 2 — Score Reset at 50 and 100 (Priority: P2) ✅ IMPLEMENTED

If a player's cumulative score lands exactly on 50 it resets to 0; exactly on 100 it resets to 50.

**Why this priority**: This is a game rule that rewards players who hit those milestones exactly.

**Independent Test**: Player has 45 points, loses a round worth 5 — score becomes 50, then resets to 0.

**Acceptance Scenarios**:

1. **Given** a player's score reaches exactly 50, **When** scores are updated, **Then** their score is set to 0
2. **Given** a player's score reaches exactly 100, **When** scores are updated, **Then** their score is set to 50
3. **Given** a player's score passes through 50 (e.g., goes from 45 to 55), **When** scores are updated, **Then** no reset occurs — only triggers on exact values

**Implementation notes**: Handled in `yanivCall` in `gameLogic.js` after score accumulation, before elimination check.

---

### User Story 3 — Player Elimination Above 100 (Priority: P2)

When a player's cumulative score exceeds 100, they are eliminated from the game and can no longer take turns.

**Why this priority**: Elimination is how the game ends — without it the game runs forever.

**Independent Test**: Player has 95 points and loses a round worth 10 — their score hits 105, which is above 100, and they are eliminated.

**Acceptance Scenarios**:

1. **Given** a player's score exceeds 100, **When** scores are updated, **Then** that player is marked as eliminated ✅ (server: `eliminatePlayers` deletes them from `game.players`)
2. **Given** a player's score lands exactly on 100, **When** scores are updated, **Then** it resets to 50 and they are NOT eliminated ✅
3. **Given** a player is eliminated, **When** the next round starts, **Then** they are not dealt cards and cannot take turns ✅ (not in `game.players` so not dealt)
4. **Given** a player is eliminated, **When** the scoreboard is shown, **Then** they appear as eliminated with their final score ❌ NOT YET — eliminated players are deleted from state before `roundEnd` fires; client never receives them

---

### Edge Cases

- What if a player's score hits exactly 100 — halving applies first, so they survive at 50
- What if all remaining players are eliminated in the same round — is there a winner?

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: ✅ System MUST maintain a cumulative score per player that persists across all rounds in a game session
- **FR-002**: ✅ System MUST add each player's hand point value to their cumulative score at the end of each round (except the round winner)
- **FR-003**: ✅ System MUST reset a player's score to 0 when it reaches exactly 50
- **FR-004**: ✅ System MUST reset a player's score to 50 when it reaches exactly 100
- **FR-005**: ✅ Score reset MUST be checked after the round's points are added, before elimination is checked
- **FR-006**: ✅ System MUST eliminate a player when their cumulative score exceeds 100 (after reset is applied)
- **FR-007**: ✅ Eliminated players MUST NOT be dealt cards or allowed to take turns in subsequent rounds
- **FR-008**: ❌ System MUST include eliminated players (with their final score) in the `roundEnd` event payload
- **FR-009**: ⏸ DEFERRED — Client display of eliminated players on the scoreboard. Server already sends `eliminated[]` in `roundEnd` and the client stores it in context. Whether/where to surface this in the UI is TBD — revisit when designing the full scoreboard in 006-scoreboard-ui.

### Key Entities

- **Player**: Cumulative score (integer), eliminated flag (boolean)

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Cumulative scores are accurate after 10 consecutive rounds with no drift
- **SC-002**: Score halving triggers on every exact-50 and exact-100 event, and never on near-misses
- **SC-003**: A player exceeding 100 points (after halving) cannot interact with the game in any subsequent round

---

## Assumptions

- The round winner scores 0 points (their hand value is not added to their score)
- Score reset milestones: exactly 50 → 0, exactly 100 → 50 (not a halving — these are the exact reset values)
- Scores are always whole numbers — no fractional values
- Score reset is applied before the elimination check in the same score update
- A score of exactly 100 triggers a reset (to 50) and does NOT trigger elimination
