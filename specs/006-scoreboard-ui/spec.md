# Feature Specification: Scoreboard UI

**Feature Branch**: `006-scoreboard-ui`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scoreboard Visible Between Rounds (Priority: P1)

After a round ends, players see a scoreboard showing all players, their current cumulative scores, and who has been eliminated — before the next round begins.

**Why this priority**: Without visible scores players have no feedback on how the game is progressing.

**Independent Test**: Complete a round — a scoreboard screen appears listing all players with their scores. Eliminated players are clearly marked.

**Acceptance Scenarios**:

1. **Given** a round ends, **When** the result screen is shown, **Then** it includes a scoreboard with all players and their current cumulative scores
2. **Given** a player has been eliminated, **When** the scoreboard is shown, **Then** they appear with an "eliminated" indicator
3. **Given** score halving occurred this round, **When** the scoreboard is shown, **Then** it shows the halved score with a visual indicator

---

### User Story 2 — Round Result Details (Priority: P2)

The result screen shows who won the round, who called Yaniv, whether Asaf occurred, and each player's hand for that round.

**Why this priority**: Players need to understand what happened to verify the outcome is fair.

**Independent Test**: After a round with Asaf, the result screen clearly labels the Asaf caller and shows +30 penalty next to their score delta.

**Acceptance Scenarios**:

1. **Given** a round ends normally, **When** the result screen shows, **Then** the winner is highlighted and all players' hands are visible
2. **Given** Asaf occurred, **When** the result screen shows, **Then** the Asaf caller is labelled and their +30 penalty is displayed
3. **Given** a player's score was halved, **When** the result screen shows, **Then** a halving indicator is shown next to their score

---

### Edge Cases

- The scoreboard only appears between rounds — it is not shown during active play.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Client MUST display a scoreboard screen between rounds showing all players, cumulative scores, and eliminated status
- **FR-002**: The scoreboard MUST highlight the round winner
- **FR-003**: The scoreboard MUST show each player's hand and point total for the completed round
- **FR-004**: The scoreboard MUST indicate Asaf and the +30 penalty when it occurred
- **FR-005**: The scoreboard MUST indicate score halving when it occurred
- **FR-006**: Eliminated players MUST be visually distinct (e.g., greyed out or labelled) on the scoreboard

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Scoreboard appears for all players within 1 second of round end
- **SC-002**: All score values on the scoreboard match the server's authoritative scores exactly
- **SC-003**: A player can identify the round winner, their own score delta, and any special events (Asaf, halving) at a glance

---

## Assumptions

- The scoreboard is shown as a full-screen overlay between rounds, not a persistent sidebar during play
- Scoreboard data is derived from the `roundEnd` event payload (spec 003)
- Scoreboard is dismissed when all players ready-up or after a 10-second auto-timeout
