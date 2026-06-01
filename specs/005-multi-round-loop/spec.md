# Feature Specification: Multi-Round Loop

**Feature Branch**: `005-multi-round-loop`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Game Resets and Next Round Starts (Priority: P1)

After the round result screen is dismissed, the game automatically resets — the deck is reshuffled, new hands are dealt to all non-eliminated players, and the next round begins.

**Why this priority**: Without a round loop the game ends after one round and players must refresh to play again.

**Independent Test**: Complete a round, dismiss the result screen — all players receive new hands and the turn indicator moves to the starting player.

**Acceptance Scenarios**:

1. **Given** the round result screen is dismissed, **When** the next round starts, **Then** the deck is reshuffled and new hands are dealt to all non-eliminated players
2. **Given** a new round starts, **When** the game state is broadcast, **Then** the discard pile is reset to one face-up card and the draw pile is full
3. **Given** a new round starts, **When** turn order is set, **Then** the first turn goes to the player after the previous round's winner

---

### User Story 2 — Game Ends When One Player Remains (Priority: P1)

When all but one player have been eliminated, the game ends and the remaining player is declared the overall winner.

**Why this priority**: This is the win condition for the full game.

**Independent Test**: Eliminate all players except one — a game-over screen appears declaring the winner.

**Acceptance Scenarios**:

1. **Given** only one non-eliminated player remains, **When** scores are updated, **Then** the game ends instead of starting a new round
2. **Given** the game ends, **When** all players view the screen, **Then** it shows the overall winner and final scores

---

### User Story 3 — Eliminated Player Spectator Mode (Priority: P2)

When a player is eliminated they can choose to leave the game or stay and watch. If they stay, they see the game as a read-only spectator and can exit to the home screen at any time. When the current game ends and a new game is offered, eliminated players are invited to join.

**Why this priority**: Keeps eliminated players engaged rather than abruptly kicked out; lets them join the next game with the same group.

**Independent Test**: Player gets eliminated — a dialog appears with "Leave" and "Watch" options. Choosing Watch shows the live game board (no hand, no action buttons). Choosing Leave returns to home.

**Acceptance Scenarios**:

1. **Given** a player is eliminated, **When** the round result screen closes, **Then** they see a choice: Leave (→ home) or Watch
2. **Given** an eliminated player chooses Watch, **When** the next round starts, **Then** they see the game board in read-only mode (no hand, no turn controls)
3. **Given** an eliminated player is watching, **When** they press Exit, **Then** they are returned to the home screen
4. **Given** the current game ends, **When** the new game invitation appears, **Then** eliminated spectators see it and can choose to join

---

### Edge Cases

- What if the last two players are both eliminated in the same round — treated as a draw
- A timeout auto-advances past the result screen if not all players acknowledge within 10 seconds
- An eliminated spectator who disconnects is simply removed silently; it does not affect the active game

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reset the deck, discard pile, and all player hands at the start of each new round
- **FR-002**: System MUST deal new hands only to non-eliminated players
- **FR-003**: System MUST start the next round automatically after the result screen is acknowledged (or after 10 second timeout)
- **FR-004**: System MUST end the game when only one non-eliminated player remains
- **FR-005**: System MUST broadcast a game-over event with the overall winner when the game ends
- **FR-006**: System MUST keep eliminated players connected to the room as spectators (they remain in the socket room but are excluded from `game.players`)
- **FR-007**: Client MUST present eliminated players with a Leave / Watch choice after the round result screen
- **FR-008**: Spectating players MUST receive all game state broadcasts (`nextRound`, `turn`, `hand` of others is not sent — only public state)
- **FR-009**: Client MUST show eliminated spectators a read-only game board with no hand and no action controls
- **FR-010**: Client MUST show an Exit button to spectators at all times, returning them to the home screen
- **FR-011**: When the game ends, the new-game invitation MUST also be shown to eliminated spectators still in the room

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new round starts within 2 seconds of the result screen being dismissed
- **SC-002**: No player state (score, eliminated flag) is lost between rounds
- **SC-003**: The game-over screen appears correctly when the last elimination occurs

---

## Assumptions

- All players must acknowledge the result screen before the next round starts, or a 10-second timeout triggers it automatically
- Simultaneous last-round eliminations are treated as a draw with no overall winner
- The player to the left of the round winner goes first in the next round
