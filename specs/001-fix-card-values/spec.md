# Feature Specification: Fix Card Values & Run Length

**Feature Branch**: `001-fix-card-values`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Face Cards Count as 10 (Priority: P1)

When a player's hand contains J, Q, or K, those cards each count as 10 points — not 11, 12, or 13.

**Why this priority**: Every score calculation is wrong until this is fixed. It's the most fundamental bug.

**Independent Test**: Hold J+Q+K — hand value must be 30, not 36.

**Acceptance Scenarios**:

1. **Given** a hand containing a Jack, **When** hand value is calculated, **Then** the Jack counts as 10
2. **Given** a hand containing a Queen, **When** hand value is calculated, **Then** the Queen counts as 10
3. **Given** a hand containing a King, **When** hand value is calculated, **Then** the King counts as 10
4. **Given** a hand of J+Q+K, **When** hand value is calculated, **Then** total is 30

---

### User Story 2 — Minimum Run Length of 3 (Priority: P1)

A player cannot discard a run of only 2 cards. Runs must be at least 3 consecutive cards of the same suit.

**Why this priority**: Allowing 2-card runs is an invalid move that gives players an unfair advantage.

**Independent Test**: Select 2 sequential same-suit cards and attempt to discard — move must be rejected.

**Acceptance Scenarios**:

1. **Given** a player selects 2 sequential same-suit cards, **When** they attempt to discard, **Then** the move is rejected with a clear error
2. **Given** a player selects 3 sequential same-suit cards, **When** they attempt to discard, **Then** the move is accepted
3. **Given** a player selects 4 sequential same-suit cards, **When** they attempt to discard, **Then** the move is accepted

---

### Edge Cases

- What if a player selects a 1-card "run"? Should be rejected the same way.
- What if the run has correct length but cards are not same suit — is that caught separately?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST assign a point value of 10 to Jack, Queen, and King in all hand-value calculations
- **FR-002**: System MUST reject a discard of a run containing fewer than 3 cards
- **FR-003**: System MUST display an error to the player when their move is rejected

### Key Entities

- **Card**: Rank, suit, point value (Ace = 1, 2–10 = face value, J/Q/K = 10)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Hand value for J+Q+K equals 30 in all scenarios
- **SC-002**: 100% of 2-card run attempts are rejected before any state change occurs
- **SC-003**: All valid combinations (sets, runs of 3+) continue to be accepted

---

## Assumptions

- Jokers (if any) are out of scope for this fix
- The fix applies to both server-side validation and any client-side display of hand values
