# Feature Specification: Scoring System

**Feature Branch**: `004-scoring-system`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scores Accumulate Across Rounds (Priority: P1)

After each round, the losing players' hand values are added to their cumulative score. Scores persist for the duration of the game.

**Why this priority**: Without persistent scoring, no meaningful multi-round game is possible.

**Independent Test**: Play 3 rounds — verify each player's total equals the sum of their round losses.

**Acceptance Scenarios**:

1. **Given** a round ends, **When** scores are updated, **Then** each losing player's score increases by their hand's point value
2. **Given** a player wins the round with 0 points, **When** scores are updated, **Then** their score does not change
3. **Given** multiple rounds have been played, **When** scores are displayed, **Then** they reflect the correct cumulative total

---

### User Story 2 — Score Halving at 50 and 100 (Priority: P2)

If a player's cumulative score lands exactly on 50 or 100, their score is immediately halved as a bonus.

**Why this priority**: This is an official Yaniv rule that rewards players who hit those milestones exactly.

**Independent Test**: Player has 40 points, loses a round worth 10 — score becomes 50, then immediately halves to 25.

**Acceptance Scenarios**:

1. **Given** a player's score reaches exactly 50, **When** scores are updated, **Then** their score is set to 25
2. **Given** a player's score reaches exactly 100, **When** scores are updated, **Then** their score is set to 50
3. **Given** a player's score passes through 50 (e.g., goes from 45 to 55), **When** scores are updated, **Then** no halving occurs — halving only triggers on exact values

---

### User Story 3 — Player Elimination Above 100 (Priority: P2)

When a player's cumulative score exceeds 100, they are eliminated from the game and can no longer take turns.

**Why this priority**: Elimination is how the game ends — without it the game runs forever.

**Independent Test**: Player has 95 points and loses a round worth 10 — their score hits 105, which is above 100, and they are eliminated.

**Acceptance Scenarios**:

1. **Given** a player's score exceeds 100, **When** scores are updated, **Then** that player is marked as eliminated
2. **Given** a player's score lands exactly on 100, **When** scores are updated, **Then** it is halved to 50 and they are NOT eliminated
3. **Given** a player is eliminated, **When** the next round starts, **Then** they are not dealt cards and cannot take turns
4. **Given** a player is eliminated, **When** the scoreboard is shown, **Then** they appear as eliminated with their final score

---

### Edge Cases

- What if a player's score hits exactly 100 — halving applies first, so they survive at 50
- What if all remaining players are eliminated in the same round — is there a winner?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a cumulative score per player that persists across all rounds in a game session
- **FR-002**: System MUST add each player's hand point value to their cumulative score at the end of each round (except the round winner)
- **FR-003**: System MUST halve a player's score when it reaches exactly 50
- **FR-004**: System MUST halve a player's score when it reaches exactly 100
- **FR-005**: Halving MUST be checked after the round's points are added, before elimination is checked
- **FR-006**: System MUST eliminate a player when their cumulative score exceeds 100 (after halving is applied)
- **FR-007**: Eliminated players MUST NOT be dealt cards or allowed to take turns in subsequent rounds

### Key Entities

- **Player**: Cumulative score (integer), eliminated flag (boolean)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cumulative scores are accurate after 10 consecutive rounds with no drift
- **SC-002**: Score halving triggers on every exact-50 and exact-100 event, and never on near-misses
- **SC-003**: A player exceeding 100 points (after halving) cannot interact with the game in any subsequent round

---

## Assumptions

- The round winner scores 0 points (their hand value is not added to their score)
- Score halving at 50 and 100 are the only halving milestones
- Scores are always whole numbers — no fractional values
- Halving is applied before the elimination check in the same score update
- A score of exactly 100 triggers halving (to 50) and does NOT trigger elimination
