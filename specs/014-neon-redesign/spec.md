# Feature Specification: Neon-Syndicate Visual Redesign

**Feature Branch**: `014-neon-redesign`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: Redesign all screens to a "neon-syndicate" (dark cyberpunk) aesthetic, using the provided Figma Make export as the visual reference. Menu/setup screens adopt the reference layout and theme; the game screen keeps its current structure but is re-themed and improved. Every existing UI component, dialog, and overlay (cards, opponent seats, round result / rematch, spectator prompt, disconnect notice, callouts) is also re-themed. Add a Home button with a leave-confirmation dialog, and fix the active-player highlight so it no longer shrinks with the hand.

## Clarifications

### Session 2026-06-22

- Q: How much of the reference's animated background (drifting grid, floating glow orbs, scanlines), and where? → A: Include it on the menu/setup screens only (welcome, host, join, lobby), reproduced faithfully from the reference's CSS keyframe animations (CSS only — no animation library). The game page keeps the reference's subtle STATIC radial-gradient glows with no animated background, so gameplay stays distraction-free and all board/card animation is reserved for feature 015.
- Q: Should the navigation controls present in the reference but missing today (Back on host/join, Leave Lobby, copy-to-clipboard on the lobby Game ID) be in scope? → A: Yes — add all of them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Re-themed game screen that keeps the current layout (Priority: P1)

A player in an active game sees the same board arrangement they already know — opponents seated in their existing positions, the draw/discard area in the centre, their own hand and controls at the bottom — but presented in the neon-syndicate style: a dark neon table surface (no green felt), high-contrast cards and text, larger and more prominent cards and piles, and a decluttered board. The active player's seat is clearly highlighted, and that highlight stays a consistent size regardless of how many cards remain in the hand.

**Why this priority**: The game screen is the core of the experience and the screen the user most wanted addressed first. It must remain functionally identical (same positions, same way to play a turn) while looking dramatically better.

**Independent Test**: Start a game and observe the board. The play flow (selecting cards, drawing from deck, taking a top-pile card, calling Yaniv) works exactly as before, the green felt is gone, cards/piles are larger and readable, and the active-seat highlight is a fixed size as cards are played.

**Acceptance Scenarios**:

1. **Given** an active game, **When** the board renders, **Then** opponents appear in the same relative positions as before the redesign and the centre and local-player areas occupy the same roles.
2. **Given** it is an opponent's turn, **When** the board renders, **Then** that opponent's seat is highlighted as the active seat, and the highlight wraps a fixed-size seat panel.
3. **Given** the local player removes cards from their hand during play, **When** the hand shrinks, **Then** the active-seat highlight around the player does not shrink with the cards.
4. **Given** the player performs any legal move (select cards then draw from deck, or take a takeable top-pile card, or call Yaniv when eligible), **When** the move is made, **Then** the outcome is identical to the pre-redesign behaviour.
5. **Given** an eliminated player (over the losing score threshold), **When** the board renders, **Then** that player's seat appears visually de-emphasised (greyed/desaturated) compared with active players.
6. **Given** the game board, **When** it renders, **Then** no demo-only or debug controls (such as a manual turn-cycler) are present.

---

### User Story 2 - Re-themed menu and setup screens (Priority: P2)

A player moving through the entry flow — welcome, hosting a game, joining a game, and the pre-game lobby — sees each screen redesigned to match the neon-syndicate reference, including its layout, glowing wordmark, glass panels, and neon controls. The flow and the actions available on each screen are unchanged.

**Why this priority**: These screens are simpler and lower-risk than the game board, but they set the visual tone and are the first thing every player sees. They depend only on the shared theme, not on the game board.

**Independent Test**: Walk through Welcome → Host → Lobby and Welcome → Join, confirming each screen matches the reference styling, all existing actions still work (host a game, join with name + game ID, see joined players, host starts the game), and the omitted copy is absent.

**Acceptance Scenarios**:

1. **Given** the welcome screen, **When** it renders, **Then** it shows the neon "YANIV" wordmark and the Host / Join actions in the reference style, and it does NOT show the "Hack the deck · Claim the syndicate" tagline or the "v2.4.1 // NEON SYNDICATE BUILD" line.
2. **Given** the host screen, **When** the player enters a name and starts, **Then** a game is created and the player advances to the lobby exactly as before, in the new styling.
3. **Given** the join screen, **When** the player enters a name and game ID and joins, **Then** they advance to the lobby, and an invalid/failed join shows an error message in the new styling.
4. **Given** the lobby, **When** it renders, **Then** it shows the game ID, the current player (with a host indicator when applicable), the list of other joined players, the waiting status, and a Start control visible only to the host — all in the reference style.
5. **Given** the host or join screen, **When** the player activates Back, **Then** they return to the welcome screen.
6. **Given** the lobby, **When** the player activates the Game ID copy control, **Then** the game ID is copied to the clipboard and the control confirms the copy.
7. **Given** the lobby, **When** the player activates Leave Lobby, **Then** they leave the room and return to the welcome screen.
8. **Given** the menu/setup screens, **When** they render, **Then** the animated neon background (grid/orbs/scanlines) is present.

---

### User Story 3 - Re-themed dialogs, overlays, and shared components (Priority: P2)

Every existing UI component and transient surface that can appear during play is restyled to match the neon-syndicate theme so nothing looks like it belongs to the old design. This covers the playing cards and opponent seats, the round-result / game-over screen and its rematch controls, the spectator prompt, the disconnect notice, and the in-game YANIV/ASAF callouts. Their behaviour and the moments they appear are unchanged — only their appearance changes.

**Why this priority**: These surfaces appear frequently during real play (every round end, on disconnect, on elimination), so a half-themed game would still feel unfinished. They share the same theme primitives as the rest of the redesign, so they can be done alongside the screens.

**Independent Test**: Trigger each overlay (end a round to see the result/rematch screen, get eliminated to see the spectator prompt, have a player disconnect to see the notice, call Yaniv/cause an Asaf to see the callouts) and confirm each is styled in the neon theme while behaving exactly as before.

**Acceptance Scenarios**:

1. **Given** a round ends, **When** the round-result / game-over screen appears, **Then** it is styled in the neon theme and its rematch controls (when offered) still function as before.
2. **Given** the local player is eliminated, **When** the spectator prompt appears, **Then** it is styled in the neon theme and its watch/leave choices still function as before.
3. **Given** a player disconnects, **When** the disconnect notice appears, **Then** it is styled in the neon theme and auto-dismisses as before.
4. **Given** a Yaniv or Asaf occurs, **When** the callout appears over the relevant seat, **Then** it is styled in the neon theme and anchored to the same player as before.
5. **Given** any screen showing cards or opponent seats, **When** it renders, **Then** the card and seat components use the neon theme consistently.

---

### User Story 4 - Leave-the-game confirmation (Priority: P3)

A player in an active game can choose to leave from a Home control on the game screen. Selecting it asks them to confirm; confirming returns them to the welcome screen, while declining returns them to the running game with no change. The confirmation is itself styled in the neon theme.

**Why this priority**: A useful convenience and part of the redesigned game chrome, but the game is fully playable without it, so it is the lowest-priority slice.

**Independent Test**: In an active game, activate the Home control, verify a neon-themed confirmation prompt appears, confirm and land on the welcome screen, then in a fresh game decline and confirm the game continues unchanged.

**Acceptance Scenarios**:

1. **Given** an active game, **When** the player activates the Home control, **Then** a neon-themed "Leave the game?" confirmation prompt appears over the game.
2. **Given** the confirmation prompt, **When** the player confirms leaving, **Then** they are taken to the welcome screen.
3. **Given** the confirmation prompt, **When** the player declines, **Then** the prompt closes and the running game is shown unchanged.

---

### Edge Cases

- **Long player names**: names that exceed the seat width must be truncated/ellipsised rather than breaking the fixed seat layout.
- **Variable player counts**: the board must keep opponents in their existing positions for every supported player count (the redesign must not regress the existing positioning logic).
- **Hand of one card vs. full hand**: the active-seat highlight size is identical in both cases.
- **Eliminated and active seats side by side**: an eliminated seat is visibly de-emphasised while an adjacent active seat still shows the active highlight.
- **Confirmation prompt during a turn change**: declining the leave prompt returns to the game in its current state without disrupting play.
- **Overlapping overlays**: callouts, the disconnect notice, and the round-result screen must each render correctly on top of the re-themed board without visual conflict.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All five screen states (welcome, host, join, lobby, game) MUST present the neon-syndicate visual theme consistently (shared palette, fonts, glow, glass panels, dark background).
- **FR-002**: The welcome, host, join, and lobby screens MUST follow the reference layout and theme, while preserving all existing actions and navigation outcomes.
- **FR-003**: The welcome screen MUST omit the "Hack the deck · Claim the syndicate" tagline and the "v2.4.1 // NEON SYNDICATE BUILD" line.
- **FR-004**: The game screen MUST retain the existing board structure and opponent positioning — opponents in their current seats, the draw/discard area in the centre, and the local player's hand and controls at the bottom.
- **FR-005**: The game screen MUST replace the green felt surface with a dark neon table surface in keeping with the theme.
- **FR-006**: The game screen MUST improve readability and prominence: higher contrast text and cards, and larger cards, deck, and discard pile relative to the previous design.
- **FR-007**: The game screen MUST be decluttered, removing demo-only/debug controls (e.g. any manual turn-cycler) and tightening the composition.
- **FR-008**: The game screen MUST preserve the existing interaction model for making a move (select cards, then draw from the deck or take a takeable top-pile card) and MUST NOT introduce a separate stand-alone discard button.
- **FR-009**: The active-player highlight MUST wrap a fixed-size seat zone and MUST NOT change size as cards are added to or removed from a hand.
- **FR-010**: An eliminated player's seat MUST be rendered in a visually de-emphasised (greyed/desaturated) state distinct from active players.
- **FR-011**: The game screen MUST provide a Home control that opens a neon-themed "Leave the game?" confirmation; confirming navigates to the welcome screen and declining returns to the running game unchanged.
- **FR-012**: Every existing UI component, dialog, and overlay MUST be restyled to the neon theme, including: the playing cards, the opponent seats, the round-result / game-over screen and its rematch controls, the spectator prompt, the disconnect notice, and the YANIV/ASAF callouts.
- **FR-012a**: Playing-card faces MUST continue to use the existing card image set (face-card illustrations and jokers preserved); the neon treatment is applied as a frame around the image (dark rounded border, neon glow, lift + glow on selection) rather than by re-drawing card faces.
- **FR-013**: All existing gameplay behaviour, navigation, and the moments at which overlays appear/dismiss MUST continue to function unchanged after the redesign (only appearance changes).
- **FR-014**: Player names rendered anywhere in the redesigned UI MUST remain safe against markup injection (no regression of the existing output-encoding guarantee).
- **FR-015**: The menu/setup screens (welcome, host, join, lobby) MUST display the reference's animated background (drifting grid, floating glow orbs, scanlines) implemented in CSS only (no animation library). The game page MUST use a subtle STATIC gradient-glow background with no animated background effects.
- **FR-016**: The setup flow MUST add the reference's navigation controls: a Back control on the host and join screens that returns to the welcome screen, a Leave Lobby control that exits the lobby (cleanly leaving the room) and returns to the welcome screen, and a copy-to-clipboard control on the lobby Game ID.

### Key Entities

*Not applicable — this feature changes presentation and one navigation control only; it introduces no new persisted data or game-state entities.*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five screen states render in the neon-syndicate theme with no leftover elements from the previous styling.
- **SC-002**: Every existing UI component and overlay (cards, opponent seats, round-result/rematch, spectator prompt, disconnect notice, callouts) renders in the neon theme.
- **SC-003**: 100% of pre-existing gameplay actions (host, join, start, select cards, draw from deck, take top-pile card, call Yaniv, view round result, rematch, spectate, handle disconnect) work identically after the redesign.
- **SC-004**: The active-seat highlight dimensions remain constant (do not vary) as a hand goes from full to a single card.
- **SC-005**: Opponent seat positions match the pre-redesign positions for every supported player count.
- **SC-006**: A player can leave an active game via the Home control and confirmation in at most two actions (open Home, confirm).
- **SC-007**: The omitted reference copy (tagline and build line) does not appear on any screen.
- **SC-008**: The redesign introduces no new automated-test or lint regressions in the existing suite/gate.

## Assumptions

- The provided Figma Make export (`client/Design YANIV Game Screen/`) is the authoritative visual reference. It is a reference only and is NOT part of the application build; it must not be imported by, bundled into, or linted as part of the app.
- The redesign is implemented in the existing client technology and styling approach (per-component plain stylesheets), not by adopting the reference project's framework/toolchain.
- The neon palette and typography follow the reference (cyan, magenta, purple accents; Orbitron / Space Mono / Inter fonts), with the additional web fonts added to the client.
- The game-screen improvements ("make it look better") are satisfied by: removing the green felt for a dark neon table, raising contrast, enlarging cards/piles, and decluttering — as agreed with the requester.
- Card faces keep the existing PNG image deck (`client/public/cards/`); the neon look is achieved by framing the image (border, glow, selection lift), NOT by switching to CSS-drawn cards like the reference export. This preserves face-card art and joker handling and avoids a card-renderer rewrite.
- The reference export does not provide finished designs for every overlay (e.g. round-result, spectator prompt, disconnect notice); those are restyled to be consistent with the reference theme primitives rather than copied pixel-for-pixel.
- Background animations in 014 are CSS keyframes ported from the reference (no animation library is added in this feature). A motion library (e.g. Framer Motion) may be introduced later for feature 015 card/board motion; that decision belongs to 015.
- The Leave Lobby control is assumed to perform a clean room exit (analogous to leaving an active game) before returning to the welcome screen; it does not need to notify or reassign the host beyond existing disconnect handling.
- Card slide/deal animations and the eliminated-player fade-out transition are OUT OF SCOPE (planned feature 015). Only the static greyed/de-emphasised eliminated state is in scope here.
- The per-move timeout and auto-elimination are OUT OF SCOPE (planned feature 016).
- Existing responsive behaviour and supported player counts are preserved; this feature does not add new game modes or change game rules.
