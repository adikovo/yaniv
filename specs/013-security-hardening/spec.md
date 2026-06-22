# Feature Specification: CI Hardening & Security

**Feature Branch**: `013-security-hardening`

**Created**: 2026-06-20

**Status**: Completed (2026-06-22)

**Completion notes**:
- **US1** — 14 client lint errors cleared (including a latent `navigate` bug in `client/src/pages/game/index.jsx`: `navigate` was referenced but never declared, so the rematch-cancelled and leave-game handlers would throw `ReferenceError`; fixing it via `const navigate = useNavigate()` restores the intended "navigate home" behavior). Server ESLint added from scratch (16 errors cleared). CI `lint` job gates client + server on errors. Delivered in PR #17.
- **US2** — `server/validation.js` validates `joinRoom`, `makeTurn`, `chatMessage` at the Socket.io boundary; closed the `makeTurn` crash/corruption vector (bad card indices) and the `startGame` no-game crash, plus a `drawTopCard` empty-top-card guard. `player.id` accepted as number or string (server assigns numeric ids). Delivered in PR #17.
- **US3** — XSS regression guard test added for player-name rendering (React output-escaping verified inert). Optional Playwright e2e smoke (T022) was skipped — see tasks.md rationale.
- Final state: client 69 tests, server 123 tests, lint clean both packages.

**Input**: User description: "CI hardening and security for the Yaniv multiplayer card game: (1) Add a lint gate to CI that fails the build on ESLint errors (after cleaning up the 14 existing errors in client/src/pages/). (2) Server-side input validation on the Socket.io event boundary — validate every socket event payload (player name length/charset, card indices, room codes) and reject malformed input so a hand-crafted socket message cannot crash the server or corrupt game state. (3) A targeted XSS test ensuring user-controlled strings (especially player names) render as inert text, not executable markup. Note: the project has NO database, so SQL injection is explicitly out of scope. The real attack surface is the Socket.io message boundary on the public server."

## Clarifications

### Session 2026-06-20

- Q: Are the optional items (dependency audit gate, rate limiting, security headers) in scope for this feature? → A: None of them. Scope is exactly lint cleanup + gate, Socket.io input validation, and the XSS test. Optional items may be revisited in a separate follow-up feature.
- Q: What are the player-name constraints? → A: 1–20 characters after trimming; allow letters, numbers, spaces, and common punctuation; reject empty/over-length names. Markup characters are NOT banned at validation — they are neutralized at render time, which is what the XSS test verifies.
- Q: What does the lint gate cover and what counts as a failure? → A: Lint both client and server; the build fails on errors only (warnings are allowed). The known errors are in the client, but the server is linted too so its code cannot rot.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean up existing lint errors and enforce a lint gate (Priority: P1)

As a maintainer, I want the existing lint errors in the codebase removed and the build to fail automatically whenever new lint errors are introduced, so that code quality stays high and broken code never reaches the live site.

This story has two halves that ship together: **first** the 14 pre-existing lint errors in the client pages are resolved so the codebase is clean, **then** a CI gate is turned on that blocks any future merge introducing new lint errors. The cleanup must come first — turning the gate on before the codebase is clean would immediately block all work.

**Why this priority**: This is the foundation. It is the cheapest, highest-value win, has no false-positive noise, and the existing 14 errors must be cleared before any lint gate can pass. Everything else builds on a green CI.

**Independent Test**: Can be fully tested by running the linter locally (it reports zero errors) and by opening a pull request that deliberately introduces a lint error (CI fails) and one that is clean (CI passes). Delivers a permanently enforced code-quality baseline.

**Acceptance Scenarios**:

1. **Given** the current codebase with 14 known lint errors, **When** the cleanup work is complete and the linter is run, **Then** the linter reports zero errors and zero warnings that would fail the gate.
2. **Given** a clean codebase and the lint gate enabled, **When** a contributor opens a pull request containing a new lint error, **Then** the CI build fails and the pull request is blocked from merging.
3. **Given** a clean codebase and the lint gate enabled, **When** a contributor opens a pull request with no lint errors, **Then** the lint step passes.
4. **Given** the cleanup changes, **When** the application is run, **Then** all affected pages behave exactly as before (no functional regression from lint fixes).

---

### User Story 2 - Reject malformed input at the Socket.io boundary (Priority: P2)

As the operator of a publicly reachable game server, I want every incoming real-time message validated so that a hand-crafted or malformed message cannot crash the server, corrupt an in-progress game, or affect other players.

The server currently trusts the shape and content of messages arriving over the real-time connection. Because the server is public, anyone can connect a custom client and send arbitrary payloads. Every inbound event (joining/creating a game, player name, playing cards, drawing, calling Yaniv, etc.) must have its payload validated — correct type, length, allowed characters, and value ranges (e.g. card selections must reference cards the player actually holds) — and anything failing validation must be rejected safely without affecting the game or other players.

**Why this priority**: This is the genuine attack surface for this application. A single malformed message today could crash the process (taking down every live game) or desync game state. This is the core of the "security" intent.

**Independent Test**: Can be fully tested by sending a battery of malformed/oversized/out-of-range/wrong-type payloads for each event from a test client and confirming the server rejects each one, stays up, and the legitimate game is unaffected — while well-formed messages continue to work normally.

**Acceptance Scenarios**:

1. **Given** the server is running, **When** a client sends a message with a missing or wrong-typed field, **Then** the server rejects the message and continues running normally.
2. **Given** a player is in a game, **When** a client sends a "play cards" message referencing cards the player does not hold or invalid indices, **Then** the move is rejected and the game state is unchanged.
3. **Given** the join/create flow, **When** a client submits a player name that is empty, over the maximum length, or contains disallowed characters, **Then** the server rejects it with a clear reason and the player is not admitted with the invalid name.
4. **Given** any malformed message, **When** it is rejected, **Then** other players in the same game observe no disruption.

---

### User Story 3 - User-controlled text renders as inert text, never executable markup (Priority: P3)

As a player, I want other players' names (and any other user-entered text shown to me) to always appear as plain text, so that a malicious player cannot inject active content that runs in my browser.

Player names travel from one client, through the server, to every other player's screen. The system must guarantee that such user-controlled strings are always displayed as literal text and never interpreted as active/executable markup, on every screen where they appear (lobby, in-game labels, scoreboard, end-of-game prompts).

**Why this priority**: The rendering layer already escapes output by default, so residual risk is low — but it is worth a targeted, regression-proof test because player names are explicitly user-controlled and broadcast to others. Lower priority because it guards an existing protection rather than closing a known hole.

**Independent Test**: Can be fully tested by entering a player name containing markup/script-like content, joining a game with another player, and confirming the name displays as literal characters (and that no injected content executes) on every screen that shows it.

**Acceptance Scenarios**:

1. **Given** a player whose name contains markup-like characters, **When** their name is displayed to another player anywhere in the UI, **Then** it appears as literal text and no injected content executes.
2. **Given** the test suite, **When** it runs, **Then** it includes a case asserting that a known injection payload in a player name renders inert, so the protection cannot silently regress.

---

### Edge Cases

- What happens when a message arrives for an event the server does not recognize? It should be ignored/rejected without error.
- What happens when a payload is structurally valid but semantically impossible (e.g. selecting more cards than exist)? It must be rejected as an invalid move.
- What happens when a player name is valid length but entirely whitespace or invisible characters? It should be rejected or normalized to a usable name.
- What happens to lint cleanup if a "fix" would change runtime behavior? The behavior-preserving fix is required; behavior must not change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 14 existing lint errors in the client pages MUST be resolved without changing the runtime behavior of those pages.
- **FR-002**: The automated CI pipeline MUST run the linter over both the client and server code on every pull request and push to the main branch.
- **FR-003**: The CI build MUST fail when the linter reports any error (warnings are permitted and do not fail the build), blocking the change from merging.
- **FR-004**: The server MUST validate the payload of every inbound real-time event before acting on it, checking type, presence of required fields, length, allowed characters, and value ranges as appropriate to each event.
- **FR-005**: The server MUST reject any message that fails validation without crashing, throwing an unhandled error, or mutating game state.
- **FR-006**: The server MUST reject "play"/move messages that reference cards or positions the player does not legitimately hold or that are out of valid range.
- **FR-007**: The server MUST enforce player-name constraints — 1 to 20 characters after trimming surrounding whitespace; allowed characters are letters, numbers, spaces, and common punctuation — rejecting names that are empty after trimming or exceed the maximum length. Markup characters are not banned here; they are neutralized at render time (see FR-009).
- **FR-008**: Rejection of an invalid message MUST NOT disrupt other players in the same game.
- **FR-009**: User-controlled text (especially player names) MUST always be rendered as inert literal text wherever it is displayed in the UI, never as executable/active markup.
- **FR-010**: The test suite MUST include an automated case proving a known injection payload in a player name renders inert, guarding against regression.
- **FR-011**: The validation rules MUST be covered by automated tests that exercise both valid (accepted) and invalid (rejected) inputs for each validated event.

### Key Entities *(include if feature involves data)*

- **Inbound Event Message**: A real-time message sent from a client to the server, identified by an event name and carrying a payload. Each event type has an expected payload shape and constraints.
- **Player Name**: A user-controlled string supplied at join/create time, broadcast to all other players and displayed across multiple screens. Constrained to 1–20 characters after trimming, drawn from letters, numbers, spaces, and common punctuation.
- **Move / Card Selection**: A payload describing a player's action (cards played, card drawn, etc.), which must reference only cards/positions the player legitimately holds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The linter reports zero errors across the codebase after cleanup.
- **SC-002**: 100% of pull requests with a lint error are blocked by CI; 100% of clean pull requests pass the lint step.
- **SC-003**: Every inbound real-time event type has at least one automated test confirming malformed input is rejected and well-formed input is accepted.
- **SC-004**: A scripted battery of malformed/oversized/out-of-range messages sent against the server results in zero server crashes and zero corrupted/disrupted games for other players.
- **SC-005**: A player name containing an injection payload renders as literal text on every screen that displays it, verified by an automated test.
- **SC-006**: No functional regression in the live game after lint cleanup and validation are deployed (existing gameplay flows continue to pass their tests).

## Assumptions

- The 14 lint errors referenced are the pre-existing ESLint errors in the client pages directory noted in project history; the exact count may shift slightly once re-run, but "clean to zero" is the target regardless of the precise number.
- "CI" refers to the project's existing GitHub Actions pipeline; the lint gate is added to that pipeline rather than introducing a new system.
- SQL injection is explicitly **out of scope** because the project has no database or query layer; the real attack surface is the real-time message boundary.
- The UI rendering layer escapes output by default; Story 3 verifies and locks in that protection rather than introducing escaping from scratch, and assumes no user-controlled string is injected as raw markup anywhere.
- Dependency audit gate, rate limiting, and security headers are explicitly **out of scope** for this feature; they may be revisited in a separate follow-up. This feature is exactly: lint cleanup + gate, Socket.io input validation, and the XSS test.
- Validation rejects bad input rather than attempting to auto-correct it, except for trimming/normalizing player names where a safe normalization is clearly preferable to rejection.
- Existing gameplay behavior is the baseline; none of this work is permitted to change how a legitimate game plays.
