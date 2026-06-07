# Feature Specification: Multi-Round Loop

**Feature Branch**: `005-multi-round-loop`

**Created**: 2026-05-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Round Ends with YANIV Animation and Next Round Starts Automatically (Priority: P1)

When a player calls Yaniv, a "YANIV!" overlay appears briefly on the board (over the caller's area). After a short delay (~2 seconds) the server automatically deals a new round — no acknowledgement or button press required.

**Why this priority**: The core game loop. Without this the game ends after one round.

**Independent Test**: Player calls Yaniv → "YANIV!" appears on screen for ~2 seconds → all players receive new hands and the board resets automatically.

**Acceptance Scenarios**:

1. **Given** a player calls Yaniv, **When** the server processes the call, **Then** a `roundEnd` event is broadcast immediately with the round result (winner, scores, asaf flag)
2. **Given** `roundEnd` is received, **When** the client renders it, **Then** a "YANIV!" visual overlay appears on the game board (not a blocking modal)
3. **Given** ~2 seconds pass after `roundEnd`, **When** the server auto-starts the next round, **Then** a `nextRound` event is broadcast and all active players receive new `hand` events
4. **Given** a new round starts, **When** the game state is broadcast, **Then** the discard pile is reset to one face-up card and the draw pile is full

---

### User Story 2 — Game Ends When One Player Remains (Priority: P1)

When all but one player have been eliminated, the game ends and the remaining player is declared the overall winner.

**Why this priority**: This is the win condition for the full game.

**Independent Test**: Eliminate all players except one — a game-over screen appears declaring the winner.

**Acceptance Scenarios**:

1. **Given** only one non-eliminated player remains after scores are applied, **When** the server checks for game end, **Then** it emits `gameOver` instead of scheduling a next round
2. **Given** the game ends, **When** all players view the screen, **Then** it shows the overall winner's name and final scores for all players

---

### User Story 3 — Eliminated Player Spectator Mode (Priority: P2)

When a player is eliminated they can choose to leave the game or stay and watch. If they stay, they see the game as a read-only spectator and can exit to the home screen at any time.

**Why this priority**: Keeps eliminated players engaged rather than abruptly kicked out.

**Independent Test**: Player gets eliminated → a dialog appears with "Leave" and "Watch" options. Choosing Watch shows the live game board (no hand, no action buttons). Choosing Leave returns to home.

**Acceptance Scenarios**:

1. **Given** a player is eliminated, **When** the `roundEnd` overlay clears, **Then** they see a choice: Leave (→ home) or Watch
2. **Given** an eliminated player chooses Watch, **When** the next round starts, **Then** they see the game board in read-only mode (no hand, no turn controls)
3. **Given** an eliminated player is watching, **When** they press Exit, **Then** they are returned to the home screen
4. **Given** the game ends, **When** the game-over / rematch screen appears, **Then** eliminated spectators see it too

---

### Edge Cases

- If the last two players are eliminated in the same round, continue to the next round until one survivor remains
- An eliminated player's socket stays connected but they are excluded from `game.players`

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reset the deck, discard pile, and all player hands at the start of each new round
- **FR-002**: System MUST deal new hands only to non-eliminated players
- **FR-003**: Server MUST auto-start the next round ~2 seconds after `roundEnd` is emitted — no client acknowledgement required
- **FR-004**: System MUST end the game when only one non-eliminated player remains
- **FR-005**: System MUST broadcast a `gameOver` event with the overall winner and final scores when the game ends
- **FR-006**: Client MUST show a non-blocking "YANIV!" overlay on the game board when `roundEnd` is received — not a modal that blocks the view
- **FR-007**: Client overlay MUST disappear automatically when the `nextRound` event arrives
- **FR-008**: Eliminated players MUST remain connected to the room (socket stays in room, excluded from `game.players`)
- **FR-009**: Client MUST present eliminated players a Leave / Watch choice once the YANIV overlay clears
- **FR-010**: Spectating (Watch) players MUST receive public game-state broadcasts (`nextRound`, `turn`) but no private `hand`
- **FR-011**: Client MUST render spectators a read-only board — no hand, no action controls — with an always-visible Exit button returning to home

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Next round starts automatically ~2 seconds after a Yaniv call — no button press needed
- **SC-002**: No player state (scores, eliminated list) is lost between rounds
- **SC-003**: The game-over screen appears correctly when the last elimination occurs

---

## Assumptions

- The 2-second auto-advance delay is server-side (`setTimeout` in the `yaniv` handler)
- The player to the left of the round winner goes first in the next round (can be random initially)
- Simultaneous last-round eliminations that leave ≥ 2 survivors continue to the next round
