# Feature Specification: Round End Event & Asaf Detection

**Feature Branch**: `003-round-end-asaf`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Round Ends When Yaniv is Called (Priority: P1)

When a player calls Yaniv, the round ends immediately. All players receive a round result screen showing the winner, each player's hand, and whether Asaf occurred.

**Why this priority**: Without a round end event the game has no conclusion — it just hangs.

**Independent Test**: Player calls Yaniv — a result screen appears for all connected players within 1 second.

**Acceptance Scenarios**:

1. **Given** a player calls Yaniv with the lowest hand, **When** the round ends, **Then** a `roundEnd` event is sent to all clients
2. **Given** the `roundEnd` event is received, **When** the client renders it, **Then** a result screen shows the winner and all players' hands
3. **Given** the result screen is shown, **When** a player views it, **Then** they can see updated cumulative scores

---

### User Story 2 — Asaf Penalty Applied (Priority: P1)

If a player calls Yaniv but another player holds an equal or lower hand value, Asaf is triggered. The caller receives a +30 penalty instead of winning the round.

**Why this priority**: Asaf is a core Yaniv rule. Without it the game rewards incorrect Yaniv calls with no consequence.

**Independent Test**: Player A calls Yaniv with 5 points; player B holds 4 points. Player A's score increases by 30. Player B wins the round.

**Acceptance Scenarios**:

1. **Given** player A calls Yaniv with hand value X, **When** player B holds hand value ≤ X, **Then** player A receives +30 penalty (Asaf)
2. **Given** Asaf is triggered, **When** the result screen appears, **Then** it clearly labels the caller as "Asaf" and shows the +30 penalty
3. **Given** Asaf is triggered, **When** scores are updated, **Then** the player with the lowest hand wins (not the Yaniv caller)
4. **Given** the Yaniv caller has the strictly lowest hand, **When** the round ends, **Then** no Asaf penalty is applied and the caller wins

---

### Edge Cases

- What if two players tie for the lowest hand when Yaniv is called — does Asaf apply if the tie is with someone other than the caller?
- What if the Yaniv caller ties with another player (equal hands) — does Asaf apply?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST emit a `roundEnd` event to all clients when a player calls Yaniv
- **FR-002**: The `roundEnd` payload MUST include: winner player ID, all players' hand values, Asaf flag, and the Asaf penalty recipient (if any)
- **FR-003**: System MUST apply a +30 point penalty to the player who called Yaniv if any other player holds an equal or lower hand value
- **FR-004**: Client MUST render a result screen upon receiving `roundEnd`
- **FR-005**: The result screen MUST show each player's hand, the winner, and whether Asaf occurred

### Key Entities

- **RoundResult**: Winner player ID, Asaf flag, Asaf target player ID, each player's hand and point value

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `roundEnd` event is received by all clients within 1 second of Yaniv being called
- **SC-002**: Asaf penalty is applied correctly in 100% of cases where another player holds ≤ the caller's hand value
- **SC-003**: Result screen appears for all players without requiring a page reload

---

## Assumptions

- Yaniv can only be called when the caller's hand value is 7 or less (existing rule, unchanged)
- If two non-caller players tie for the lowest hand, the first in turn order wins
- Asaf applies when any other player's hand is equal to OR lower than the caller's hand
