# Feature Specification: Player-Anchored Yaniv/Asaf Call-Outs

**Feature Branch**: `009-player-anchored-callouts`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "Player-anchored Yaniv/Asaf call-out overlays. Currently, when a player calls Yaniv (or an Asaf occurs), a generic square overlay pops up centered at the top of the screen, identical regardless of who called. Replace this with positional call-outs anchored to the player who acted: when player X calls Yaniv, a large comic-style 'YANIV!' call-out appears over player X's area on every client's screen. In an Asaf scenario, the call-outs appear in sequence: 'YANIV!' over the caller first, then 'ASAF!' over the countering player. These call-outs replace the current centered round-end overlay entirely."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Yaniv call-out appears over the caller (Priority: P1)

When any player calls Yaniv, every player at the table sees a large comic-style "YANIV!" call-out appear directly over that player's area — over the opponent's hand area if an opponent called it, or over the local player's own hand if they called it. Everyone immediately understands *who* ended the round without reading a centered banner.

**Why this priority**: This is the core of the feature — replacing the anonymous centered overlay with a positional one. Without it nothing else in the feature exists.

**Independent Test**: Start a game with 2+ players, have one player call Yaniv with a valid hand, and verify on every client that the "YANIV!" call-out renders over the calling player's area (and nowhere else), then the next round starts as it does today.

**Acceptance Scenarios**:

1. **Given** a round in progress with 4 players, **When** an opponent calls Yaniv successfully, **Then** every client shows a "YANIV!" call-out anchored over that opponent's hand area, and the old centered round-end overlay does not appear.
2. **Given** a round in progress, **When** the local player calls Yaniv successfully, **Then** that player sees the "YANIV!" call-out over their own hand area, and all other clients see it over that player's opponent area.
3. **Given** a Yaniv call-out is displayed, **When** the next round begins (existing automatic flow), **Then** the call-out is dismissed and normal play resumes with updated scores on the scoreboard.

---

### User Story 2 - Asaf sequence: Yaniv over caller, then Asaf over the counterer (Priority: P2)

When a Yaniv call is countered (another player holds an equal or lower hand), players first see "YANIV!" over the caller, then "ASAF!" appears over the countering player. The sequence reads like the real table moment: a call, then the counter.

**Why this priority**: Asaf is the dramatic highlight of the game and the situation where knowing *who* did *what* matters most, but it builds directly on the positioning mechanics of Story 1.

**Independent Test**: Engineer a round where the Yaniv caller is beaten by another player's equal/lower hand, and verify both call-outs appear in the correct order over the correct players on every client.

**Acceptance Scenarios**:

1. **Given** player X calls Yaniv and player Y holds an equal or lower hand, **When** the round ends, **Then** every client first shows "YANIV!" over player X's area, followed by "ASAF!" over player Y's area.
2. **Given** an Asaf occurred, **When** the "ASAF!" call-out is shown, **Then** it visibly conveys the 30-point penalty applied to the Yaniv caller (e.g., a "+30" indicator) so players understand the consequence.
3. **Given** the Asaf sequence completes, **When** the next round begins, **Then** both call-outs are dismissed and the scoreboard reflects the penalty.

---

### User Story 3 - Call-outs position correctly for every seat and player count (Priority: P3)

The call-out renders correctly regardless of where the acting player sits on the local layout — left opponent, top opponent, right opponent, or the local player at the bottom — in games of 2, 3, or 4 players, without covering the call-out player's name/score so the context stays readable.

**Why this priority**: Correct anchoring across all seats is what makes the feature trustworthy, but it is a refinement of the rendering introduced in Stories 1–2.

**Independent Test**: Run rounds in 2-, 3-, and 4-player games where each seat position triggers the call-out at least once, and verify the call-out is visually attached to the right player's area on every client and stays fully on screen.

**Acceptance Scenarios**:

1. **Given** a 4-player game, **When** each of the four players (in different rounds) is the Yaniv caller, **Then** the call-out renders over the correct area for each seat position on every client.
2. **Given** a 2-player game, **When** either player calls Yaniv, **Then** the call-out anchors correctly to the single opponent area or the local hand area.
3. **Given** a call-out is displayed over any seat, **When** it renders, **Then** it remains fully within the viewport and does not obstruct the scoreboard.

---

### Edge Cases

- A player is eliminated at round end: the elimination/spectator prompt flow that today appears after the round-end overlay is dismissed must still trigger after the call-out sequence completes.
- The round that ends the entire game: the game-over flow must still appear after (or instead of conflicting with) the call-out sequence.
- The acting player disconnects between calling Yaniv and the call-out rendering: the call-out should still display at that player's last known seat, or degrade gracefully without blocking the next round.
- Asaf where the counterer is the local player: "ASAF!" renders over the local player's own hand area.
- A spectator (eliminated player watching) must also see the call-outs anchored to the correct players.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a player successfully calls Yaniv, the system MUST display a "YANIV!" call-out visually anchored to that player's area on every connected client (including spectators).
- **FR-002**: The call-out MUST anchor to the local player's own hand area when the local player is the actor, and to the corresponding opponent area otherwise.
- **FR-003**: In an Asaf scenario, the system MUST display "YANIV!" over the caller first, then "ASAF!" over the countering player, in that order, as a visible sequence.
- **FR-004**: The "ASAF!" call-out MUST convey the 30-point penalty applied to the Yaniv caller.
- **FR-005**: The call-outs MUST be rendered as styled text (large comic-style lettering, yellow with dark outline, consistent with the game's visual tone) — no external image assets.
- **FR-006**: The call-outs MUST replace the existing centered round-end overlay entirely; the centered overlay MUST be removed.
- **FR-007**: The existing round-advance flow (next round starting automatically after the round ends, with the round winner taking the first turn) MUST continue to work unchanged; call-outs MUST be dismissed when the next round begins.
- **FR-008**: The elimination/spectator prompt and game-over flows that currently follow the round-end overlay MUST still trigger correctly after the call-out sequence.
- **FR-009**: Call-outs MUST render correctly for every seat position (left, top, right opponents and bottom local player) in 2-, 3-, and 4-player games, staying fully within the viewport.

### Key Entities

- **Call-out**: A transient visual announcement ("YANIV!" or "ASAF!") tied to a specific player and displayed for a limited duration at round end.
- **Round-end result**: Existing data describing who called Yaniv, whether an Asaf occurred and by whom, eliminations, and updated scores — the source the call-outs are driven from.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of round endings, every connected client shows the round-ending call-out over the correct player's area.
- **SC-002**: In an Asaf round, 100% of clients show the two call-outs in the correct order (Yaniv caller first, counterer second).
- **SC-003**: A new player watching a round end can identify who called Yaniv (and who Asaf'd) without reading any centered text — verifiable in a usability check.
- **SC-004**: Round-to-round flow timing is unchanged: the next round still starts within the same delay window as today, with no rounds blocked by the new call-outs.
- **SC-005**: No regression in the existing end-of-round flows: elimination prompt, spectator mode, and game-over all behave as before across a full multi-round game.

## Assumptions

- The next round is started automatically by the server after a short fixed delay (existing behavior); no user interaction is required to advance, so removing the centered overlay does not require a new "next round" control.
- The call-out display duration fits within the existing round-transition window (round end → next round deal → brief dismissal delay); the Asaf sequence splits that window (Yaniv first, Asaf following roughly a beat later) rather than extending it.
- Seat positions on each client's layout are already known (the existing opponent areas), so call-outs can anchor to them without new data from the server.
- The round-end data already identifies the Yaniv caller and Asaf counterer (used by the current overlay), so no new server-side information is required.
- Winner name text shown in the old centered overlay is no longer needed — the anchoring itself communicates who acted; the scoreboard remains the source for score details.
