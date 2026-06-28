# Feature Specification: Lobby Leave/Disconnect Broadcast

**Feature Branch**: `015-lobby-leave-broadcast`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Lobby leave/disconnect broadcast: when a player leaves (via the Leave Lobby button) or disconnects while the room is still in the pre-game lobby (before the game has started), the other players waiting in that lobby must be notified so their player roster updates in real time to remove the player who left. Currently the remaining waiting players' rosters never update because the server only broadcasts player-removal events after the game has started. The fix is server-side: reuse the existing player-roster-update mechanism to also notify remaining lobby members in the pre-game case. Applies to both the explicit leave action and unexpected disconnects. Out of scope: any change to in-game (post-start) disconnect behavior, which already works."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Waiting player sees roster update when someone leaves the lobby (Priority: P1)

Several players have joined a room and are waiting in the pre-game lobby for the game to start. One of them clicks the Leave Lobby button. Every other player still waiting in that lobby sees the leaver removed from the displayed roster of waiting players, in real time, without needing to refresh.

**Why this priority**: This is the core defect. Without it, the lobby roster shows phantom players who have already left, which misleads the host about who is actually present and ready before starting the game.

**Independent Test**: Join a room with two or more players so all see each other in the waiting roster, have one player use Leave Lobby, and confirm the remaining players' rosters drop the leaver within a moment.

**Acceptance Scenarios**:

1. **Given** three players (A, B, C) are waiting in the same pre-game lobby and each sees all three in the roster, **When** player C clicks Leave Lobby, **Then** players A and B see the roster update to show only A and B.
2. **Given** two players (A, B) are waiting in a pre-game lobby, **When** player B leaves, **Then** player A sees the roster update to show only A (and remains able to wait for others or start when eligible).

---

### User Story 2 - Waiting player sees roster update when someone disconnects from the lobby (Priority: P2)

Players are waiting together in a pre-game lobby. One player's connection drops unexpectedly (closes the tab, loses network, browser crash). Every other player still in that lobby sees the disconnected player removed from the waiting roster in real time.

**Why this priority**: Disconnects are less explicit than pressing Leave but produce the same stale-roster problem. Covering it makes the roster trustworthy regardless of how a player departs. Slightly lower priority because it shares the same remedy as P1 and is harder to trigger deliberately.

**Independent Test**: Join a lobby with two or more players, abruptly close one player's tab, and confirm the remaining players' rosters drop the disconnected player.

**Acceptance Scenarios**:

1. **Given** three players (A, B, C) are waiting in the same pre-game lobby, **When** player C's connection drops, **Then** players A and B see the roster update to show only A and B.

---

### Edge Cases

- When the **last remaining** player leaves or disconnects (emptying the lobby), no roster update needs to reach anyone, and the now-empty room is cleaned up as it is today.
- When a player leaves **after** the game has started, the existing in-game departure behavior continues to apply unchanged (this feature does not alter it).
- If a player leaves at nearly the same moment the game is starting, the remaining players end up with a roster consistent with who actually entered the game (no ghost entries left behind).
- A player who leaves and then re-joins the same lobby appears once in the roster, not duplicated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a player explicitly leaves a room that is still in the pre-game lobby, the system MUST notify every other player remaining in that lobby so their displayed waiting roster updates to exclude the leaver.
- **FR-002**: When a player disconnects unexpectedly from a room that is still in the pre-game lobby, the system MUST notify every other player remaining in that lobby so their displayed waiting roster updates to exclude the disconnected player.
- **FR-003**: The roster update sent to remaining lobby members MUST reflect the current set of players still present in the lobby after the departure.
- **FR-004**: The system MUST NOT send a roster update to a player who has just left or disconnected.
- **FR-005**: When the departing player was the last one in the lobby, the system MUST NOT attempt to notify anyone and MUST clean up the empty room as it does today.
- **FR-006**: The system MUST NOT change the behavior that applies when a player leaves or disconnects after the game has started.
- **FR-007**: The roster update MUST reach remaining lobby members in real time, without those players needing to refresh or take any action.

### Key Entities *(include if feature involves data)*

- **Lobby (pre-game room)**: A room that players have joined but whose game has not yet started. Holds the set of players currently waiting.
- **Waiting roster**: The list of players a waiting player sees in the lobby; must stay consistent with the players actually present.
- **Roster-update notification**: The real-time message that informs remaining lobby members of the current waiting roster after a player joins or departs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any player leaves or disconnects from a pre-game lobby, every remaining player's waiting roster reflects the departure within 2 seconds, with no manual refresh.
- **SC-002**: 100% of pre-game lobby departures (explicit leave and disconnect) result in an updated roster for all remaining players; zero ghost entries remain.
- **SC-003**: In-game (post-start) departure behavior is unchanged, verified by existing scenarios continuing to pass.
- **SC-004**: Emptying a lobby (last player departs) produces no errors and leaves no lingering room state.

## Assumptions

- The lobby already uses a real-time roster-update mechanism (the same one used when a player joins) that can be reused for departures; no new notification channel is introduced.
- "Pre-game lobby" means the period after players join a room but before the game has started.
- The client already renders the waiting roster from roster-update notifications, so no client change is required for the update to take effect.
- Multiple players may be waiting in a lobby at once; the fix applies regardless of how many remain after a departure.
- This is a server-side fix; the in-game departure path is intentionally left untouched.
