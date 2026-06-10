# Tasks: Player-Anchored Yaniv/Asaf Call-Outs

**Input**: Design documents from `/specs/009-player-anchored-callouts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: TDD — every behavior task pair below is *failing test first, then implementation*. The feature closes with the Playwright e2e smoke test as final validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Web app: `client/src/` (React, Vitest + Testing Library, colocated `*.test.jsx`, run `cd client && npm run test`), `server/` (Express, Jest, run `cd server && npm test`), `e2e/` (Playwright, repo root, run `npx playwright test`).

---

## Phase 1: Setup

**Purpose**: Confirm a green baseline before TDD begins

- [x] T001 Run the existing client test suite (`cd client && npm run test`) and confirm green; verify the server Jest setup runs (`cd server && npm test` — use `--passWithNoTests` if no tests exist yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explicit `yanivCaller` in the round-end data, and the `CallOut` component — every user story depends on both

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Write failing Jest tests in `server/gameLogic.test.js`: `yanivCall` returns `caller` as the calling player in the normal case (caller wins) and in the asaf case (where `winner` must be the countering player and `asaf` true)
- [x] T003 Make T002 pass: change `yanivCall` in `server/gameLogic.js` to `return { winner, asaf, caller }` (drop `asafCaller`), then update the `roundEnd` emit in `server/socket.js` (~line 112) to send `yanivCaller: { id: caller.id, name: caller.name }` and remove the `asafCaller` field
- [x] T003b Write failing Jest tests in `server/gameLogic.test.js` for `asafPlayers`: `yanivCall` returns `asafPlayers` as an array of all players with sum ≤ caller's sum (empty array when no asaf); then make them pass by updating `yanivCall` to collect all counters and the `roundEnd` emit in `server/socket.js` to include `asafPlayers: [{ id, name }]`
- [x] T004 [P] Write failing Vitest tests for the CallOut component in `client/src/components/call-out/call-out.test.jsx`: renders "YANIV!" for variant `yaniv` and "ASAF!" for variant `asaf`; applies `call-out-yaniv` / `call-out-asaf` container classes; shows "+30" only when `penalty` is true
- [x] T005 Make T004 pass: implement the CallOut component in `client/src/components/call-out/index.jsx` (props: `variant`, `penalty` — per plan.md Phase 2)
- [x] T006 [P] Create comic-style CSS in `client/src/components/call-out/styles.css`: absolute centering over parent, yellow→orange gradient text with dark layered text-shadow outline, slight rotation, pop-in keyframes (scale 0 → 1.15 → 1, ~350ms), red/orange `call-out-asaf` variant, `pointer-events: none`, `z-index: 60`

**Checkpoint**: Server sends `yanivCaller`; `CallOut` renders correctly in isolation — user story phases can begin

---

## Phase 3: User Story 1 - Yaniv call-out appears over the caller (Priority: P1) 🎯 MVP

**Goal**: "YANIV!" renders anchored over the calling player's area on every client; the old centered overlay is gone

**Independent Test**: 2+ player round where each role (local caller / opponent caller) triggers Yaniv → call-out appears inside the correct player container; old `.yaniv-overlay` never renders

- [x] T007 [US1] Write failing tests in `client/src/components/opponent-area/opponent-area.test.jsx`: renders the CallOut inside the area when the `callout` prop is set; renders no call-out when `callout` is null/undefined
- [x] T008 [US1] Make T007 pass: add the `callout` prop to `client/src/components/opponent-area/index.jsx` (render `<CallOut>` as last child) and ensure `.opponent-area { position: relative; }` in `client/src/components/opponent-area/styles.css`
- [x] T009 [US1] Wire the game page `client/src/pages/game/index.jsx`: add `calloutFor(id)` (id comparison against `yanivResult.yanivCaller.id` — yaniv branch only for now, per plan.md Phase 5); pass `callout={calloutFor(p.id)}` to every OpponentArea in **both** the main and spectator views; render `<CallOut>` inside `.local-player-area` when `calloutFor(player.id)` is non-null; ensure `.local-player-area { position: relative; }` in `client/src/pages/game/styles.css`
- [x] T010 [US1] Remove both `<YanivOverlay>` renders and the import from `client/src/pages/game/index.jsx`, then delete `client/src/components/yaniv-overlay/` (index.jsx + styles.css)
- [x] T011 [US1] Run both suites (`cd client && npm run test`, `cd server && npm test`) — all green; quick manual check of a 2-player round (caller and non-caller perspectives)

**Checkpoint**: US1 is a shippable MVP — positional Yaniv call-out, old overlay removed

---

## Phase 4: User Story 2 - Asaf sequence (Priority: P2)

**Goal**: In an Asaf round: "YANIV!" over the caller first, then "ASAF!" (+30) over the counterer ~1.5s later

**Independent Test**: Round engineered so the caller is countered → both call-outs appear in order over the correct players

- [ ] T012 [US2] Write failing tests for the sequencing hook in `client/src/hooks/use-asaf-sequence.test.js` (renderHook + vitest fake timers): returns false when result is null or `asaf` is false; flips to true ~1500ms after an asaf result arrives; resets to false when the result clears; clears the timer on unmount
- [ ] T013 [US2] Make T012 pass: implement `useAsafSequence(yanivResult)` in `client/src/hooks/use-asaf-sequence.js` (timer in a ref, cleanup on change/unmount — per plan.md Phase 5)
- [ ] T014 [US2] Wire sequencing into `client/src/pages/game/index.jsx`: `const showAsaf = useAsafSequence(yanivResult)` and extend `calloutFor` with the asaf branch — `{ variant: 'asaf', penalty: true }` when `yanivResult.asaf && showAsaf && id === yanivResult.winner.id`
- [ ] T015 [US2] Run the client suite — all green; manual check of an asaf round (sequence order and "+30" visible)

**Checkpoint**: Full Yaniv→Asaf drama works end to end

---

## Phase 5: User Story 3 - Correct anchoring for every seat and player count (Priority: P3)

**Goal**: Call-outs render fully on-screen and attached to the right area for left/top/right/local seats in 2–4 player games

**Independent Test**: Rounds in 2-, 3-, and 4-player games with each seat as the actor → call-out anchored correctly, fully in viewport, scoreboard unobstructed

- [ ] T016 [US3] Write failing tests in `client/src/components/opponent-area/opponent-area.test.jsx`: the call-out renders inside the positioned container for each `position` value (`left`, `top`, `right`)
- [ ] T017 [US3] Viewport-safety CSS in `client/src/components/call-out/styles.css`: `max-width: 90vw`, `clamp()`-based font-size that fits the narrow left/right seats; verify in `client/src/pages/game/styles.css` that the call-out never overlaps the scoreboard area
- [ ] T018 [US3] Manual/visual verification: run 2-, 3-, and 4-player games where each seat triggers Yaniv (and one asaf) — confirm anchoring, viewport fit, and the spectator view on all clients

**Checkpoint**: All user stories complete

---

## Final Phase: Polish & E2E Smoke Test

**Purpose**: Cross-cutting validation — the feature closes with the full e2e run

- [ ] T019 Update `e2e/four-player-game.spec.ts`: replace `.yaniv-overlay` waits with `.call-out-yaniv` asserted *inside* the acting player's container (`.opponent-area` on non-caller clients, `.local-player-area` on the caller's client); keep the round-advance flow assertions
- [ ] T020 Final validation: run the client unit suite (`cd client && npm run test`), server tests (`cd server && npm test`), and the Playwright e2e smoke test (`npx playwright test`) — all green (SC-001, SC-004, SC-005)

---

## Dependencies

- **Phase 1 → Phase 2 → user stories**: T002–T003 (server `yanivCaller`), T003b (server `asafPlayers`), and T004–T006 (CallOut) block all stories; T003b must land before T009
- **US1 (T007–T011)**: depends only on Foundational; delivers the MVP
- **US2 (T012–T015)**: depends on US1 (game page wiring + `calloutFor` exist)
- **US3 (T016–T018)**: depends on US1 (callout prop on OpponentArea); independent of US2
- **Final (T019–T020)**: depends on US1 (selectors); run after US2 + US3
- Within every test/implementation pair, the failing test task MUST precede its implementation task (TDD)

## Parallel Opportunities

- T004 (CallOut tests, client) in parallel with T002–T003 (server) — different stacks
- T006 (CSS) alongside T004/T005 (different file)
- After US1: US2 (T012–T015) and US3 (T016–T018) touch mostly different files and can proceed in parallel

## Implementation Strategy

MVP first: Phases 1–3 (T001–T011) deliver a shippable increment — explicit `yanivCaller` from the server, positional "YANIV!" call-out, old overlay removed. Then US2 adds the Asaf sequence, US3 hardens seat positioning, and the final phase locks everything in with the e2e smoke test.
