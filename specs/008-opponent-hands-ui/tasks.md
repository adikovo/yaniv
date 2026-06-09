# Tasks: Opponent Hands UI

**Input**: Design documents from `/specs/008-opponent-hands-ui/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Confirm the card back asset is in place (user confirmed already added).

- [ ] T001 Verify `client/public/cards/back.png` exists and renders correctly in a browser

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side data changes and client state wiring that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Extend `turn` event in `server/socket.js` to include `hand_sizes: { [playerId]: count }` — add computation after both `cardFromDeck` and `cardFromTop` handlers
- [ ] T003 Extend `dealNewRound()` in `server/socket.js` to include `hand_sizes` in both `start` and `nextRound` event payloads
- [ ] T004 Add `handSizes` state (`useState({})`) and `opponentScores` state (`useState({})`) to `client/src/context/game-context.jsx`
- [ ] T005 Update `turn` socket handler in `client/src/context/game-context.jsx` to call `setHandSizes(hand_sizes)` when `hand_sizes` is present in the event
- [ ] T006 Update `start` socket handler in `client/src/context/game-context.jsx` to call `setHandSizes(hand_sizes)` when `hand_sizes` is present
- [ ] T007 Add `roundEnd` score extraction in `client/src/context/game-context.jsx`: on `roundEnd`, build `{ [id]: score }` from `players` map and call `setOpponentScores`
- [ ] T008 Fix `playerDisconnected` handler in `client/src/context/game-context.jsx` to also call `setPlayers(prev => prev.filter(p => p.id !== id))` (currently only shows a notice)
- [ ] T009 Expose `handSizes`, `setHandSizes`, `opponentScores`, `setOpponentScores` in the GameContext provider value in `client/src/context/game-context.jsx`
- [ ] T010 Add `faceDown` boolean prop to `client/src/components/card/index.jsx` — when true, render `<img src="cards/back.png" />` and disable click handler
- [ ] T011 Create pure helper `getOpponentPositions(players, localPlayerId)` in `client/src/utils/opponent-positions.js` — returns `{ [playerId]: 'top' | 'left' | 'right' }` using turn-order logic from data-model.md
- [ ] T012 Create `client/src/components/opponent-area/index.jsx` — `OpponentArea` component with props `{ name, handCount, score, isActive, position }` rendering name, face-down card fan, and score badge
- [ ] T013 Create `client/src/components/opponent-area/styles.css` — styles for `.opponent-area`, `.opponent-hand` (overlapping fan via negative margin), `.opponent-name` (truncated with ellipsis), `.score-badge` (circular badge)

**Checkpoint**: Server sends hand counts; client context tracks handSizes, opponentScores; Card renders face-down; OpponentArea component exists

---

## Phase 3: User Story 1 — Opponents' Cards and Scores Visible (Priority: P1) 🎯 MVP

**Goal**: In a 2-player game, the opponent's name, face-down hand, and score appear on screen and stay in sync with every action.

**Independent Test**: Start a 2-player game, verify opponent area shows at the top with correct card count and score; draw a card and verify the count updates; call Yaniv and verify score updates.

- [ ] T014 [US1] Import `OpponentArea`, `getOpponentPositions`, `handSizes`, `opponentScores` into `client/src/pages/game/index.jsx`
- [ ] T015 [US1] In `game/index.jsx` `game()` function, replace the `<ul>` player list with `OpponentArea` components — filter out the local player, pass `handSizes[p.id]`, `opponentScores[p.id]`, `isActive={gameState.current_turn === p.id}`, `position={positionMap[p.id]}`
- [ ] T016 [US1] Add `useMemo` to derive `positionMap = getOpponentPositions(players, player.id)` in `client/src/pages/game/index.jsx`

**Checkpoint**: 2-player game shows opponent area at top with correct card count and score; counts update live during play

---

## Phase 4: User Story 2 — Layout Adapts to Player Count (Priority: P2)

**Goal**: 2-player shows opponent at top; 3-player shows left + right; 4-player shows left + top + right. No overlaps.

**Independent Test**: Start games with 2, 3, and 4 players; verify each player count shows the correct opponent positions with no visual overlap.

- [ ] T017 [US2] Add CSS Grid layout to `client/src/pages/game/styles.css` — define `.game-board` with grid-template-areas for `players-2` (top/center/bottom), `players-3` (left+right/center/bottom), `players-4` (left+top+right/center/bottom) variants
- [ ] T018 [US2] Wrap the game board contents in a `<div className={`game-board players-${players.length}`}>` in `client/src/pages/game/index.jsx`
- [ ] T019 [US2] Assign `grid-area` CSS to `.opponent-top`, `.opponent-left`, `.opponent-right`, `.center-area`, and `.local-player-area` in `client/src/components/opponent-area/styles.css` and `client/src/pages/game/styles.css`
- [ ] T020 [US2] Wrap the local player hand + controls in a `<div className="local-player-area">` in `client/src/pages/game/index.jsx`
- [ ] T021 [US2] Wrap the deck + top card in a `<div className="center-area">` in `client/src/pages/game/index.jsx`

**Checkpoint**: All 3 player-count layouts display correctly with opponents at the right positions

---

## Phase 5: User Story 3 — Active Player Highlighted (Priority: P3)

**Goal**: The active player's area (opponent or local) gets a visual highlight; all others do not.

**Independent Test**: Play through a few turns and verify the highlight moves to the correct player's area on each turn change.

- [ ] T022 [US3] Add `.active-turn` highlight style (e.g., `box-shadow: 0 0 12px #ffd700; border-radius: 8px`) to `client/src/components/opponent-area/styles.css`
- [ ] T023 [US3] Add `.active-turn` highlight style for the local player area to `client/src/pages/game/styles.css`
- [ ] T024 [US3] Apply `active-turn` class to the local player area div when `gameState.current_turn === player.id` in `client/src/pages/game/index.jsx`

**Checkpoint**: Highlight moves to the correct player area on each turn; only one player is highlighted at a time

---

## Phase 6: User Story 4 — Disconnect Removes Player and Re-Adjusts Layout (Priority: P4)

**Goal**: When a player leaves mid-game, their area disappears and remaining opponents reposition correctly.

**Independent Test**: In a 3-player game, have one player disconnect; verify their opponent area vanishes and the remaining two use the 2-player layout (top position only).

- [ ] T025 [US4] Verify that T008's `playerDisconnected` fix causes the `players` array to update, which reactively changes `players.length` and triggers the correct grid class — no additional code needed if T008 is correct; otherwise fix the reactive dependency in `game/index.jsx`
- [ ] T026 [US4] Verify `getOpponentPositions` handles edge case where `players` array has changed (player removed) — confirm no stale position assignments remain by testing in a 3→2 player scenario

**Checkpoint**: Disconnected player's area disappears and layout re-adjusts automatically to the new player count

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Remove the legacy text player list (`<ul>` and `<h3>` turn indicator text) from `client/src/pages/game/index.jsx` now that OpponentArea replaces it
- [ ] T028 [P] Remove the legacy text player list from the spectator view in `client/src/pages/game/index.jsx` and apply the same OpponentArea layout for spectators
- [ ] T029 Smoke test full 2-player, 3-player, and 4-player games end-to-end; verify card counts, scores, highlights, layout, and disconnect behavior all work together

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational (T010–T013)
- **US2 (Phase 4)**: Depends on US1 completion (uses same game page and context)
- **US3 (Phase 5)**: Depends on US1 (uses OpponentArea and game page structure)
- **US4 (Phase 6)**: Depends on Foundational T008 — can overlap with US2/US3
- **Polish (Phase 7)**: Depends on all user stories complete

### Within Each Phase

- T002 and T003 touch the same file (`server/socket.js`) — run sequentially
- T004–T009 all touch `game-context.jsx` — run sequentially
- T010 (Card), T011 (helper), T012–T013 (OpponentArea) are independent — can run in parallel [P]
- T014–T016 all touch `game/index.jsx` — run sequentially within US1
- T017–T021 split across CSS and JSX — T017/T019 (CSS) can run in parallel with T018/T020/T021 (JSX)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify card back asset)
2. Complete Phase 2: Foundational (T002–T013)
3. Complete Phase 3: US1 (T014–T016)
4. **STOP and VALIDATE**: Start a 2-player game, confirm opponent area shows correct card count and score
5. Proceed to US2 layout work

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1) → Opponents visible in 2-player game ✓ MVP
3. Phase 4 (US2) → All player-count layouts correct ✓
4. Phase 5 (US3) → Turn highlight works ✓
5. Phase 6 (US4) → Disconnect handling ✓
6. Phase 7 → Polish ✓

---

## Notes

- No test files — manual verification at each checkpoint
- Server changes (T002, T003) must be deployed/restarted before client changes can be verified
- Card back asset (`public/cards/back.png`) confirmed added by user (T001 is a quick verification only)
- `getOpponentPositions` is a pure function — easy to verify in isolation before wiring to the game page
