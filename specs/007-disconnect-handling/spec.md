# Feature Specification: Player Disconnect Handling & Turn Rotation Fix

**Feature Branch**: `007-disconnect-handling`

**Created**: 2026-06-09

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Continues After a Mid-Round Disconnect (Priority: P1)

In a 3-player game, one player disconnects mid-round. The remaining two players should be able to finish the round and game without it stalling.

**Why this priority**: Core game-breaking bug — the game currently freezes indefinitely when a disconnected player's turn comes up. This makes any disconnect a session-killer for everyone still connected.

**Independent Test**: Start a 3-player game. Disconnect one player mid-round. Confirm the remaining two players can continue taking turns and finish the round.

**Acceptance Scenarios**:

1. **Given** a 3-player game is in progress and it is NOT the disconnecting player's turn, **When** that player disconnects, **Then** they are removed from the active rotation and the turn eventually skips them when it would have been theirs.
2. **Given** a 3-player game and it IS the disconnecting player's turn, **When** they disconnect, **Then** the turn advances to the next active player within 1 second.
3. **Given** a player disconnects between rounds (after round end, before next round start), **When** the next round begins, **Then** it starts without that player.

---

### User Story 2 - Game Ends When Only One Player Remains After Disconnect (Priority: P1)

If a disconnect reduces the active player count to 1, the remaining player wins immediately — there is no one-player game state.

**Why this priority**: Without this, the lone remaining player would be in an unwinnable, unescapable loop.

**Independent Test**: Start a 2-player game. Disconnect one player. Confirm the remaining player sees a game-over screen declaring them the winner.

**Acceptance Scenarios**:

1. **Given** a 2-player game and one player disconnects, **When** the disconnect is processed, **Then** the remaining player is immediately declared the winner and a game-over event is emitted.
2. **Given** a 3-player game where 2 players disconnect in quick succession, **When** only 1 player remains, **Then** that player is declared the winner.

---

### User Story 3 - Correct Turn Rotation With Non-Contiguous Player IDs (Priority: P1)

After any player is removed (disconnected or eliminated by score), turn advancement must cycle correctly through the remaining active players — no skipped turns, no undefined lookups.

**Why this priority**: Silent data-corruption bug. The current `nextTurn` logic uses `% player_count` on numeric IDs. If players 0, 1, 2 exist and player 1 is removed, the modulo wraps to player index 1 — which is now player 2, but the lookup resolves to `undefined`. This breaks all subsequent turns.

**Independent Test**: In a 3-player game (IDs 0, 1, 2), eliminate or disconnect player 1. Verify turns cycle correctly between players 0 and 2 with no errors.

**Acceptance Scenarios**:

1. **Given** players 0, 1, 2 and player 1 is removed, **When** a turn advances from player 0, **Then** player 2 gets the next turn (not undefined).
2. **Given** players 0, 1, 2 and player 0 is removed, **When** a turn advances, **Then** it cycles correctly between players 1 and 2.
3. **Given** any subset of remaining player IDs, **When** turns advance repeatedly, **Then** every active player gets exactly one turn per rotation in clockwise order before cycling back.
4. **Given** a player is eliminated by score at the end of a round, **When** the next round's turns advance, **Then** the eliminated player never appears in the rotation.

---

### Edge Cases

- What if 2 players disconnect at exactly the same time — who wins?
- What if a player disconnects during the 2-second delay between round end and next round start?
- What if the last-standing player after disconnects was already at a score near elimination?
- What happens to cards a disconnecting player had just discarded (top of pile) — do they stay?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove a disconnected player from the active game player roster immediately upon disconnect.
- **FR-002**: If the disconnecting player held the current turn, the system MUST advance the turn to the next active player.
- **FR-003**: A disconnecting player's partial turn (if any) MUST be abandoned; game state is rolled back to before their action and the next player's turn begins.
- **FR-004**: The system MUST emit a notification to remaining connected players when a player disconnects.
- **FR-005**: If only 1 active player remains after a disconnect, the system MUST end the game and declare that player the winner.
- **FR-006**: The `nextTurn` logic MUST identify the next player by iterating over actual active player IDs, not by using modulo on the count of players.
- **FR-007**: The corrected turn rotation MUST apply to both disconnect removals and score-based eliminations.
- **FR-008**: Turn order MUST remain clockwise (ascending player ID, wrapping from the highest active ID back to the lowest).
- **FR-009**: If active players reach zero simultaneously (e.g., two simultaneous disconnects), the system MUST handle this gracefully without crashing (treat as a draw or no-winner outcome).

### Key Entities

- **Active Player**: A player who is in `game.players`, has not been eliminated by score, and whose socket is connected.
- **Turn Order**: The ordered cycle of active player IDs; must be recalculated whenever any player is removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a player disconnects, game play resumes for remaining players within 1 second — no manual intervention required.
- **SC-002**: Turn rotation produces the correct next player in 100% of scenarios involving any combination of player removals (disconnects or eliminations).
- **SC-003**: A game with 2+ connected players can always be played to completion regardless of mid-game disconnects.
- **SC-004**: Zero crashes or frozen game states caused by a missing player being looked up as the current turn holder.

## Assumptions

- Player IDs are numeric integers assigned sequentially at join time (0, 1, 2…); IDs are never reused or reassigned within a session.
- There is no reconnection or rejoin flow — a disconnect is permanent for that session.
- Clockwise order is defined as ascending numeric player ID order, wrapping from the highest active ID back to the lowest active ID.
- Spectators are not active players and are unaffected by this turn logic.
- The "winner starts next round" change (already implemented on this branch) is out of scope for this spec.
