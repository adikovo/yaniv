# Feature Specification: Fix Atomic Turn Flow

**Feature Branch**: `002-fix-turn-flow`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Draw Triggers Discard Atomically (Priority: P1)

When it is a player's turn, they select cards to discard and then click the draw button. Both actions — discarding the selected cards and drawing a new card — happen as one atomic step. There is no in-between state.

**Why this priority**: A broken turn flow desyncs all players and makes multiplayer unplayable.

**Independent Test**: In a two-player game, player 1 selects a card and clicks draw — their hand loses the discarded card and gains a drawn card in a single update. Player 2 sees the new top of the discard pile immediately.

**Acceptance Scenarios**:

1. **Given** a player has selected cards to discard, **When** they click the draw button, **Then** the discard and draw happen simultaneously in one server action
2. **Given** the action completes, **When** other players receive the update, **Then** the discard pile shows the newly discarded card on top
3. **Given** a player has not selected any cards, **When** they click draw, **Then** the action is rejected with a clear error
4. **Given** it is not a player's turn, **When** they attempt a draw/discard action, **Then** the server rejects it

---

### Edge Cases

- What if the player selects cards but the draw pile is empty?
- What if the player draws from the discard pile — do they receive the top card before or after their discard lands?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process discard and draw as a single atomic server action
- **FR-002**: The draw button MUST trigger the discard of selected cards simultaneously
- **FR-003**: System MUST reject a draw action if no cards are selected for discard
- **FR-004**: System MUST reject any turn action from a player whose turn it is not
- **FR-005**: All connected clients MUST receive the updated game state after each atomic turn action

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No player can be in a state where they have discarded but not yet drawn
- **SC-002**: All clients show consistent game state within 1 second of a turn completing
- **SC-003**: Out-of-turn actions are rejected 100% of the time

---

## Assumptions

- A player must always discard before drawing — they cannot draw without discarding
- Drawing from the discard pile vs the draw pile are both covered by this atomic action
