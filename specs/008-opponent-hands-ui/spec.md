# Feature Specification: Opponent Hands UI

**Feature Branch**: `008-opponent-hands-ui`

**Created**: 2026-06-09

**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See All Opponents' Cards and Score During Play (Priority: P1)

As a player in an active game, I want to see each opponent's face-down hand (the correct number of card backs), their name, and their current game score at all times, so I can track how many cards they hold and how well they are doing.

**Why this priority**: Core gameplay awareness — knowing how many cards opponents hold and their accumulated score is essential strategic information in Yaniv.

**Independent Test**: Can be fully tested in a 2-player game by verifying the opponent's card area appears at the top with the correct number of face-down cards and correct score, both updating appropriately after each action.

**Acceptance Scenarios**:

1. **Given** a 2-player game is active, **When** the game screen is shown, **Then** the opponent's name, face-down hand (card backs equal to their hand size), and their current game score appear at the top of the screen.
2. **Given** an opponent draws a card, **When** their hand count changes, **Then** the face-down hand in their area immediately updates to reflect the new count.
3. **Given** an opponent discards cards, **When** their hand count decreases, **Then** the face-down hand in their area immediately reflects the reduced count.
4. **Given** a round ends after a Yaniv call, **When** scores are calculated, **Then** each opponent's score badge updates to reflect their new cumulative game score.

---

### User Story 2 — Opponent Layout Adapts to Player Count (Priority: P2)

As a player, I want the opponent areas to be positioned appropriately around the table based on how many players are in the game, so the layout always feels like a real card table.

**Why this priority**: The positional layout directly affects the usability and feel of the game for all supported player counts (2–4).

**Independent Test**: Can be tested by starting games with 2, 3, and 4 players and verifying the correct layout appears each time.

**Acceptance Scenarios**:

1. **Given** a 2-player game, **When** the game screen is shown, **Then** the single opponent appears at the top of the screen, centered.
2. **Given** a 3-player game, **When** the game screen is shown, **Then** one opponent appears on the left side and one on the right side.
3. **Given** a 4-player game, **When** the game screen is shown, **Then** opponents appear on the left side, at the top center, and on the right side.
4. **Given** any player count, **When** the game screen is shown, **Then** no opponent area overlaps with the deck, the top card, or the local player's hand.

---

### User Story 3 — Active Player Highlighted During Their Turn (Priority: P3)

As a player, I want the currently active player's area to be visually highlighted, so I can instantly tell whose turn it is without reading text.

**Why this priority**: Reduces cognitive load — especially useful on mobile where the text turn indicator may be small or out of view.

**Independent Test**: Can be tested by observing that the highlight moves to each player's area as turns rotate.

**Acceptance Scenarios**:

1. **Given** it is an opponent's turn, **When** the game screen is shown, **Then** that opponent's area has a distinct visual highlight and no other player area is highlighted.
2. **Given** it is the local player's turn, **When** the game screen is shown, **Then** the local player's hand area is highlighted, not any opponent area.
3. **Given** the turn changes, **When** the next player's turn begins, **Then** the highlight moves immediately to the new active player's area.

---

### User Story 4 — Layout Adjusts When a Player Disconnects (Priority: P4)

As a remaining player, I want the UI to remove a disconnected player's area and reposition the remaining opponents, so the layout does not show empty or stale slots.

**Why this priority**: Keeps the game board clean and accurate; stale opponent areas would confuse remaining players about how many opponents they face.

**Independent Test**: Can be tested by having a player leave mid-game and verifying their area disappears and the remaining opponents reposition correctly.

**Acceptance Scenarios**:

1. **Given** an opponent disconnects mid-game, **When** the disconnect is confirmed, **Then** that opponent's area is removed from the game board immediately.
2. **Given** an opponent's area has been removed, **When** the remaining opponent count changes the applicable layout rule, **Then** the remaining opponents reposition to match the new player count layout (e.g., a 4-player game becomes a 3-player layout).

---

### Edge Cases

- What happens when an opponent has 0 cards? Their area shows no card backs but still displays their name and score.
- What happens if a player's name is very long? Names are truncated with an ellipsis to prevent overflow.
- What happens when a player disconnects? Their area is removed from the UI and the remaining opponents reposition according to the updated player count layout.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game screen MUST display a dedicated area for each opponent showing their name, face-down card backs (equal to their current hand size), and their current game score.
- **FR-002**: Opponent card backs MUST NOT reveal any card values or suits — only the card back design is shown.
- **FR-003**: The number of face-down cards shown in each opponent's area MUST stay in sync with the server-reported hand size after every game action.
- **FR-004**: Each opponent's game score MUST be displayed as a badge near their area and MUST update after each round ends (following a Yaniv call).
- **FR-005**: For a 2-player game, the single opponent area MUST appear at the top of the screen, centered.
- **FR-006**: For a 3-player game, opponent areas MUST appear on the left side and right side of the screen.
- **FR-007**: For a 4-player game, opponent areas MUST appear on the left side, at the top center, and on the right side.
- **FR-008**: The currently active player's area MUST be visually highlighted; all other player areas MUST NOT be highlighted simultaneously.
- **FR-009**: The local player's hand area MUST also receive the same highlight when it is their turn.
- **FR-010**: Opponent face-down cards on the left and right side positions MUST be displayed as an upright overlapping fan spread (matching the visual style of the local player's hand, but face-down).
- **FR-011**: Opponent names MUST be displayed near their card area, truncated with an ellipsis if too long to fit.
- **FR-012**: When a player disconnects, their opponent area MUST be removed from the game board and the remaining opponents MUST reposition to match the updated player count layout.

### Key Entities

- **Opponent Area**: A UI region representing one non-local player; contains their name, face-down card fan, and a game score badge.
- **Table Layout**: The spatial arrangement of all player areas and the center play area (deck + top card), determined by the current active player count.
- **Active Turn Highlight**: A visual indicator applied to whichever player area corresponds to the current turn.
- **Game Score**: Each player's cumulative score across rounds, updated after each Yaniv call resolves.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a 2-player game, a player can identify the opponent's name, card count, and score within 2 seconds of the game screen loading.
- **SC-002**: In games with 3 or 4 players, no opponent area, the deck, the top card, or the local hand overlap on screen.
- **SC-003**: The active turn highlight updates within 1 second of the turn changing, across all player counts.
- **SC-004**: The face-down card count for each opponent is accurate after every game action (draw, discard, Yaniv call).
- **SC-005**: Each opponent's score badge reflects the correct cumulative score immediately after round-end score calculation.
- **SC-006**: Players can identify the active player at a glance without reading the turn-indicator text.
- **SC-007**: When a player disconnects, their area is removed and the layout re-adjusts within 1 second of the disconnect being confirmed.

---

## Assumptions

- The server already broadcasts each player's hand size and game score as part of game state; no new server-side data model changes are required.
- The game supports 2 to 4 players; layouts for 5+ players are out of scope.
- The existing card back asset is reused for opponent face-down cards.
- The local player always appears at the bottom; this position does not change.
- Player order assignment for left/right positions follows turn order relative to the local player (player immediately before in turn order → left; player immediately after → right; player across in a 4-player game → top).
- Mobile portrait is the primary target layout; landscape is out of scope for this feature.
- The score badge design follows the existing circular badge style already used in the game UI.
- When a disconnect occurs, the server-side disconnect handling (already built in branch 007) provides the signal to remove the player from the client's player list.
