---
description: "Task list for feature 014 — Neon-Syndicate Visual Redesign"
---

# Tasks: Neon-Syndicate Visual Redesign

**Input**: Design documents from `/specs/014-neon-redesign/`

**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: Included only for behavior-bearing changes (leave/clipboard wiring, fixed-highlight invariant, eliminated-state class, XSS no-regression) + a closing e2e smoke. Pure cosmetic CSS is NOT unit-tested. Per project convention, write test tasks via the `tester` subagent and ensure they FAIL before implementing.

**Organization**: Tasks are grouped by user story. Reference reskin source: `client/Design YANIV Game Screen/src/app/App.tsx` (reference only — never imported/built).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 maps to spec.md user stories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and build hygiene

- [X] T001 Add `lucide-react` to client dependencies in `client/package.json` (icons: Home, Copy, Check, ChevronLeft, Crown, Wifi)
- [X] T002 [P] Add Orbitron / Space Mono / Inter web-font `<link>` tags (with system fallbacks) in `client/index.html`
- [X] T003 [P] Add `client/Design YANIV Game Screen/` to `.gitignore` and confirm Vite build + ESLint gate do not include it

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared neon theme layer every screen/component consumes (research R1)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define neon theme tokens (CSS custom properties: `--neon-cyan/#00f0ff`, `--neon-magenta/#ff2e97`, `--neon-purple/#9b5fff`, `--bg-deep`, glass bg/border) and dark base/reset in `client/src/index.css` (replacing legacy light-mode Vite defaults)
- [ ] T005 Add reusable neon primitives to the shared theme: glow-button classes (cyan/magenta/purple), glass-panel classes, neon input, and keyframes `gridDrift`, `orbFloat`, `pulseC`, `pulseM`, `calloutIn`, `blipDot` in `client/src/index.css` (or `client/src/styles/theme.css`)
- [ ] T006 Remove/trim legacy default styles in `client/src/App.css` that conflict with the dark neon theme

**Checkpoint**: Theme tokens, fonts, and keyframes available — user stories can begin

---

## Phase 3: User Story 1 - Re-themed game screen, same layout (Priority: P1) 🎯 MVP

**Goal**: The game board looks neon (dark table, no felt, bigger/high-contrast cards & piles, decluttered) while keeping existing positions and play flow; active seat highlight is a fixed size; eliminated seats are de-emphasised.

**Independent Test**: Start a game — flow is identical, green felt gone, cards/piles larger, active-seat highlight does not shrink as the hand shrinks, eliminated seat is greyed, no demo controls.

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [ ] T007 [P] [US1] Test: active-seat highlight wraps a fixed-size seat panel and its dimensions do not change with hand count (FR-009/SC-004) in `client/src/components/opponent-area/opponent-area.test.jsx`
- [ ] T008 [P] [US1] Test: an eliminated player's seat receives the de-emphasis class (FR-010) in `client/src/components/opponent-area/opponent-area.test.jsx`

### Implementation for User Story 1

- [ ] T009 [US1] Restyle Card with a neon frame around the existing PNG (dark rounded border, neon glow, selected lift+glow, takeable state, face-down back) in `client/src/components/card/styles.css` (+ minimal class hooks in `client/src/components/card/index.jsx`)
- [ ] T010 [US1] Restyle opponent-area as a fixed-size seat panel: stable min dimensions, active-turn pulse on the panel (not the cards), eliminated de-emphasis, name ellipsis in `client/src/components/opponent-area/index.jsx` + `styles.css`
- [ ] T011 [US1] Replace green felt with a dark neon table surface (deep radial bg + cyan edge-glow ring), preserving the `getOpponentPositions` layout in `client/src/pages/game/styles.css`
- [ ] T012 [US1] Game screen chrome: add header with the "YANIV" neon wordmark, enlarge cards/deck/discard, tighten spacing, and remove any demo/debug controls in `client/src/pages/game/index.jsx` + `styles.css`
- [ ] T013 [US1] Local-player area: fixed-size active highlight (no shrink with hand), restyle score badge / hand / YANIV button / sum in `client/src/pages/game/index.jsx` + `styles.css`

**Checkpoint**: Game board fully re-themed and playable; MVP demoable

---

## Phase 4: User Story 2 - Re-themed menu/setup screens + nav controls (Priority: P2)

**Goal**: Welcome/Host/Join/Lobby match the reference (layout + theme + animated background) and gain Back, Leave Lobby, and copy-Game-ID controls.

**Independent Test**: Walk Welcome → Host → Lobby and Welcome → Join: each is neon-styled with the animated background, all existing actions work, Back returns to welcome, copy-Game-ID copies, Leave Lobby exits cleanly, and the tagline/build-line are absent.

- [ ] T014 [US2] Create `particle-grid` animated-background component (CSS drifting grid + floating orbs + scanlines, using the Phase-2 keyframes) in `client/src/components/particle-grid/index.jsx` + `styles.css`

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [ ] T015 [P] [US2] Test: Back returns to welcome; copy-Game-ID writes the game ID to the clipboard; Leave Lobby emits `leaveRoom` and navigates home in `client/src/pages/lobby/lobby.test.jsx` (and `client/src/pages/home/home.test.jsx` for Back)

### Implementation for User Story 2

- [ ] T016 [US2] Welcome screen: neon "YANIV" wordmark + Host/Join neon buttons + `particle-grid` background; OMIT the "Hack the deck · Claim the syndicate" tagline and the "v2.4.1 // NEON SYNDICATE BUILD" line in `client/src/pages/home/index.jsx` + `styles.css`
- [ ] T017 [US2] Host & Join forms: neon glass panels, neon inputs/buttons, error styling, and a Back control returning to welcome in `client/src/pages/home/index.jsx` + `styles.css`
- [ ] T018 [US2] Lobby: neon glass layout, Game ID banner with copy-to-clipboard, neon player list + host indicator, host Start button, and a Leave Lobby control (emit `leaveRoom` then navigate `/`), with `particle-grid` background in `client/src/pages/lobby/index.jsx` + `styles.css`

**Checkpoint**: Entry flow fully re-themed with new controls

---

## Phase 5: User Story 3 - Re-themed dialogs & overlays (Priority: P2)

**Goal**: Transient overlays match the theme — round-result/rematch, spectator prompt, disconnect notice, YANIV/ASAF callouts.

**Independent Test**: Trigger each overlay (round end, elimination, disconnect, Yaniv/Asaf) and confirm neon styling with unchanged behavior.

- [ ] T019 [P] [US3] Restyle round-result / game-over screen and its rematch controls to neon in `client/src/components/round-result/styles.css` (+ class hooks in `index.jsx`)
- [ ] T020 [P] [US3] Restyle spectator-prompt (watch/leave) to neon in `client/src/components/spectator-prompt/styles.css`
- [ ] T021 [P] [US3] Restyle call-out (YANIV/ASAF) to neon using the `calloutIn` keyframe in `client/src/components/call-out/styles.css`
- [ ] T022 [US3] Restyle the inline disconnect notice to neon in `client/src/pages/game/index.jsx` + `styles.css`

**Checkpoint**: No overlay looks like the old design

---

## Phase 6: User Story 4 - Home button + leave-confirmation dialog (Priority: P3)

**Goal**: A Home control on the game screen opens a neon "Leave the game?" dialog; confirm → welcome (clean exit), decline → resume.

**Independent Test**: In a game, click Home → neon dialog appears; "No" resumes unchanged; "Yes" leaves and lands on welcome.

- [ ] T023 [US4] Create `leave-dialog` component (neon "Leave the game?" confirm with Yes/No) in `client/src/components/leave-dialog/index.jsx` + `styles.css`

### Tests for User Story 4 ⚠️ (write first, ensure they FAIL)

- [ ] T024 [P] [US4] Test: Home opens the dialog; "No" keeps the game mounted; "Yes" emits `leaveRoom` and navigates to `/` in `client/src/pages/game/game.test.jsx`

### Implementation for User Story 4

- [ ] T025 [US4] Add the Home button to the game header and wire it to `leave-dialog`: confirm → emit `leaveRoom` + `navigate('/')`, cancel → close; replace the current emit-less `handleLeave` in `client/src/pages/game/index.jsx` + `styles.css`

**Checkpoint**: All four stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Confirm the existing player-name XSS guard still passes across re-themed components (FR-014, no regression) in `client/src/components/opponent-area/opponent-area.test.jsx`
- [ ] T027 Run the client lint gate; ensure no new errors and the reference export folder is excluded
- [ ] T028 Playwright e2e smoke: Welcome → Host → Lobby → Game renders and the core play flow works after the restyle (closes the feature) in the client e2e suite
- [ ] T029 [P] Responsive/edge pass: small-width usability, long-name ellipsis in seats, and all supported player counts keep their positions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: no dependencies
- **Foundational (P2)**: depends on Setup — BLOCKS all user stories
- **US1 (P3)**: after Foundational — the MVP
- **US2 (P4)**: after Foundational — independent of US1
- **US3 (P5)**: after Foundational; call-out/disconnect render on the game screen, so easiest to verify after US1
- **US4 (P6)**: edits the game screen header — sequence after US1 (shares `game/index.jsx`)
- **Polish (P7)**: after all desired stories

### Within Each User Story

- Tests (where present) written and FAILING before implementation
- Shared components before the screens that compose them (e.g. T014 particle-grid before T016/T018; T023 leave-dialog before T025)

### Parallel Opportunities

- Setup: T002, T003 in parallel
- US1 tests: T007, T008 in parallel
- US3: T019, T020, T021 in parallel (separate component files); T022 touches the game page
- Polish: T026, T029 in parallel
- Note: tasks editing the same file (the game page: T011/T012/T013, T022, T025) are sequential, not [P]

---

## Implementation Strategy

### MVP First

1. Setup (P1) → Foundational (P2)
2. US1 (game board) → **STOP & validate**: play a game, confirm flow unchanged + new look + fixed highlight
3. Demo (this is the highest-value slice the user asked for first)

### Incremental Delivery

US1 → US2 → US3 → US4, each a self-contained, demoable increment. The user works sequentially; suggest a commit after each task or logical group (user runs git).

---

## Notes

- The reference export (`client/Design YANIV Game Screen/`) is read-only inspiration; never import or build it.
- Card faces stay PNG; neon look is a CSS frame (FR-012a) — no card-renderer rewrite.
- Background animation is CSS-only in 014; a motion library is deferred to feature 015.
- Deferred (see memory `project-lobby-leave-broadcast`): verify lobby-leave notifies other waiting players; if not, a small server tweak — out of this task list unless it surfaces during T018.
- Test-writing tasks use the `tester` subagent; verify red before green; close with the T028 Playwright smoke.
