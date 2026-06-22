---
description: "Task list for CI Hardening & Security"
---

# Tasks: CI Hardening & Security

**Input**: Design documents from `/specs/013-security-hardening/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Included. TDD is established project practice and the spec requires automated tests (FR-010, FR-011; SC-003, SC-005). Per project practice, write tests via the `tester` subagent and ensure they fail before implementing.

**Organization**: Tasks grouped by user story (US1=P1, US2=P2, US3=P3). The three stories are independent and can be delivered separately.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3

## Path Conventions

Web app, two packages: `client/` (ESM, React, Vitest) and `server/` (CommonJS, Express+Socket.io, Jest). CI in `.github/workflows/ci.yml`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline so all stories can be worked and verified.

- [X] T001 Install dependencies for both packages: `npm ci` in `client/` and in `server/` (and root for Playwright)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required — the three stories share no blocking prerequisite and are independently implementable.

**Checkpoint**: Proceed directly to user stories. They may be done in any order or in parallel.

---

## Phase 3: User Story 1 - Lint cleanup + CI lint gate (Priority: P1) 🎯 MVP

**Goal**: Zero ESLint errors across client and server, enforced by a CI gate that fails on errors (warnings allowed).

**Independent Test**: `npm run lint` reports 0 errors in both packages; a PR with a deliberate error turns the new CI `lint` job red, a clean PR keeps it green.

### Cleanup — client errors (behavior-preserving unless noted)

- [X] T002 [P] [US1] Remove unused `React` import in `client/src/AppRouter.jsx`
- [X] T003 [P] [US1] Remove unused `useState` import in `client/src/components/card/index.jsx`
- [X] T004 [P] [US1] Remove unused `setPlayers`/`setLocalPlayer` in `client/src/pages/game/game.test.jsx`
- [X] T005 [P] [US1] Remove unused `players`/`setPlayers` destructure in `client/src/pages/home/index.jsx`
- [X] T006 [US1] In `client/src/pages/game/index.jsx`: **fix the `navigate` bug** — declare `const navigate = useNavigate()` (resolves the unused `useNavigate` import + both `no-undef` errors at lines ~45 and ~250). ⚠️ Behavior change: those handlers go from throwing to navigating home (intended). Confirm with user before/at review.
- [X] T007 [US1] In `client/src/pages/game/index.jsx`: delete dead `getTopCard` helper (the only user of undefined `getCardImageName`) and remove unused `setPlayer`/`setSum`/`lastCard` locals
- [X] T008 [US1] Run `cd client && npm run lint` → confirm 0 errors (warnings OK); run `npm test` → confirm no regression

### Server lint setup

- [X] T009 [US1] Add ESLint as a dev dependency and a `"lint": "eslint ."` script in `server/package.json` (match the client's ESLint major version)
- [X] T010 [US1] Create `server/eslint.config.js` — flat config for CommonJS + Node + Jest globals, `eslint:recommended` ruleset
- [X] T011 [US1] Run `cd server && npm run lint`; fix any errors surfaced so it reports 0 errors

### CI gate

- [X] T012 [US1] Add a `lint` job to `.github/workflows/ci.yml` that runs `npm ci` + `npm run lint` for both `client/` and `server/` on the existing push/PR triggers (ESLint default exit handles errors-only)

**Checkpoint**: Codebase lint-clean; CI lint gate live. MVP complete and deployable.

---

## Phase 4: User Story 2 - Reject malformed input at the Socket.io boundary (Priority: P2)

**Goal**: Every payload-bearing inbound socket event is validated; malformed input is rejected without crashing or mutating state.

**Independent Test**: Run the validation test suite — each event has ≥1 accept and ≥1 reject case; a malformed-message battery causes 0 crashes and 0 disruption to other players; existing server tests still pass.

### Tests for User Story 2 (write first, ensure they FAIL) ⚠️

- [X] T013 [US2] Via the `tester` subagent, write failing Jest tests in `server/tests/validation.test.js` covering the accept/reject matrix in `data-model.md` for `joinRoom`, `makeTurn`, `chatMessage`, and the `startGame` no-game guard (valid → ok, invalid shapes/types/ranges → rejected, never throws, state unchanged)

### Implementation for User Story 2

- [X] T014 [US2] Create `server/validation.js` with pure validators returning `{ ok, value }` / `{ ok, reason }`: `validateJoinRoom`, `validateMakeTurn`, `validateChatMessage`; trim+bound player name per `data-model.md` (1–20 chars), no new runtime dependency
- [X] T015 [US2] In `validateMakeTurn`: reject non-object `turn_data` (the crash vector at socket.js:75), unknown `type`, and `selected_cards` that aren't an array of unique integer indices within `0 ≤ i < hand.length`, plus invalid `side` for `cardFromTop` — closes FR-006
- [X] T016 [US2] Wire `validateJoinRoom` into the `joinRoom` handler in `server/socket.js` (reject before joining/creating the room)
- [X] T017 [US2] Wire `validateMakeTurn` into the `makeTurn` handler in `server/socket.js`, in front of the existing turn/player guards (reuse `turnError` channel where present)
- [X] T018 [US2] Wire `validateChatMessage` into the `chatMessage` handler in `server/socket.js` (drop non-string/over-length)
- [X] T019 [US2] Add an existence guard in the `startGame` handler in `server/socket.js` so an absent `games[room]` returns safely instead of throwing (current crash vector at socket.js:49)
- [X] T020 [US2] Run `cd server && npm test` → validation tests pass and all existing server suites still pass (no gameplay regression)

**Checkpoint**: Socket boundary hardened; server resilient to hand-crafted messages.

---

## Phase 5: User Story 3 - User text renders as inert (Priority: P3)

**Goal**: An injection payload in a player name renders as literal text everywhere it appears, locked in by an automated test.

**Independent Test**: The XSS test renders a name-displaying component with an injection payload and asserts the literal string shows as text and no `<img>`/`<script>` node is created.

### Tests for User Story 3 (write first) ⚠️

- [X] T021 [US3] Via the `tester` subagent, write a Vitest + Testing Library test (e.g. `client/src/components/round-result/round-result.test.jsx` or `opponent-area`) rendering a name like `<img src=x onerror=alert(1)>`, asserting `getByText` finds the literal string and `container.querySelector('img,script')` is null
- [~] T022 [P] [US3] (Optional — SKIPPED) Playwright e2e smoke. Skipped: the component-level XSS unit test already proves React's escaping deterministically; names render via a single uniform `{name}` text path with no raw-HTML sinks, so the e2e adds only marginal real-browser confidence.

### Implementation for User Story 3

- [X] T023 [US3] If any test reveals an unescaped render site, fix it to render the name as text (React default escaping should make this a no-op; no `dangerouslySetInnerHTML` exists today)
- [X] T024 [US3] Run `cd client && npm test` (and Playwright if T022 done) → XSS test passes

**Checkpoint**: XSS protection verified and regression-guarded.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 Run full suites end to end: client `npm test`, server `npm test`, `npm run lint` (both packages) → all green
- [X] T026 Update `specs/013-security-hardening/spec.md` status to reflect completion and note the `navigate` bug fix outcome

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: empty — no blocker
- **User Stories (Phase 3–5)**: each depends only on Setup; mutually independent (different files/packages). Can run in parallel or in priority order P1 → P2 → P3
- **Polish (Phase 6)**: after the stories you intend to ship

### Within Each User Story

- US1: client cleanups T002–T005 are parallel [P] (distinct files); T006–T007 both edit `game/index.jsx` (sequential); server T009→T010→T011; T012 last
- US2: test T013 first (must fail) → T014→T015 (module) → T016–T019 (all edit `socket.js`, sequential) → T020
- US3: test T021 first → T023 (likely no-op) → T024; T022 optional [P]

### Parallel Opportunities

- US1 file cleanups: T002, T003, T004, T005 together
- The three stories can be assigned to different people simultaneously after Setup

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup
2. Phase 3 US1 — lint clean + gate
3. **STOP and VALIDATE**: lint green locally + in CI
4. Ship — this alone delivers a permanent quality gate

### Incremental Delivery

US1 (gate) → US2 (validation, the real security win) → US3 (XSS guard). Each is independently testable and shippable; commit after each task or logical group (user runs git).

---

## Notes

- [P] = different files, no dependencies. Socket.js wiring tasks are NOT [P] (same file).
- Write tests via the `tester` subagent; verify they fail before implementing (US2 especially).
- T006 is the one task that intentionally changes runtime behavior (the `navigate` bug fix) — flag at review.
- No new server runtime dependency (validation is hand-rolled); ESLint is a dev dependency only.
