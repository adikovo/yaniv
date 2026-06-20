# Phase 0 Research: CI Hardening & Security

## R1: Server lint tooling

**Decision**: Add ESLint to the `server/` package as a dev dependency with a minimal flat config (`server/eslint.config.js`) targeting a CommonJS + Node + Jest environment, plus a `"lint": "eslint ."` script. Reuse the same ESLint major version already used by the client to avoid version drift.

**Rationale**: The client already lints with ESLint flat config; matching that on the server keeps one tool, one mental model. The server is CommonJS (`require`/`module.exports`) and Node globals (`console`, `process`, `setTimeout`), and tests use Jest globals (`describe`, `test`, `expect`) — the config must declare these so legitimate code doesn't trip `no-undef`. Recommended rule set: `eslint:recommended` only, so the gate stays low-noise (errors fail, style warnings allowed per clarification).

**Alternatives considered**: (a) A single root ESLint config covering both packages — rejected because client (ESM/React) and server (CommonJS/Node) need different parser/globals, and the packages install independently in CI. (b) Skip server lint — rejected; the clarification explicitly chose client + server so server code can't rot.

## R2: The 14 lint errors are not all cosmetic — some are latent bugs

**Decision**: Categorize the errors and fix each by its category. Pure `no-unused-vars` get removed/cleaned with zero behavior change. The `no-undef` errors are **real bugs** and their fix intentionally restores the originally-intended behavior — these will be called out explicitly for user review.

**Findings** (from `npm run lint` + reading `src/pages/game/index.jsx`):
- `no-unused-vars` (cosmetic, behavior-preserving): unused `React` import (`AppRouter.jsx`), unused `useState` (`card/index.jsx`), unused `setPlayers`/`setLocalPlayer` (`game.test.jsx`), unused `useNavigate` import + `setPlayer`/`setSum`/`players`/`setPlayers` destructures (`game/index.jsx`, `home/index.jsx`), unused `getTopCard`/`lastCard` locals.
- `no-undef` (**latent bugs**): `navigate` is referenced at `game/index.jsx:45` and `:250` (rematch-cancelled handler and "leave" handler → `navigate('/')`) but `const navigate = useNavigate()` is never declared — these calls would throw `ReferenceError` if those paths execute. `getCardImageName` (`:100`) is referenced inside the unused `getTopCard` helper (commented "not needed").

**Resolution approach**:
- For the `navigate` bug: declare `const navigate = useNavigate()` (this simultaneously fixes the unused-import error and the `no-undef` error) — this is the correct fix and restores intended navigation. Flag to user: this *changes* runtime behavior from "throws" to "navigates home," which is the intended behavior.
- For `getTopCard`/`getCardImageName`: the helper is dead code ("not needed") — delete it, removing both the unused-var and the no-undef reference. No behavior change (it was never called).
- All remaining unused vars: delete the declarations/imports.

**Rationale**: Honors FR-001 ("without changing runtime behavior") for the genuinely cosmetic majority, while being transparent that two `no-undef` items are bug fixes that necessarily alter the (currently broken) behavior. Suppressing them with disable-comments would be dishonest and leave the bug.

**Alternatives considered**: Disabling `no-undef` or adding `eslint-disable` comments — rejected; hides real bugs. Auto-fix only — rejected; `no-undef` is not auto-fixable and needs judgment.

## R3: Validation approach at the Socket.io boundary

**Decision**: Hand-rolled, synchronous guard functions in a new `server/validation.js`, one validator per inbound event with a payload, returning a result the handler can act on (valid → proceed; invalid → `return` / emit a `turnError`/error). No schema library.

**Rationale**: The server currently has **zero** validation and no validation dependency. The payloads are small and well-known (see the accept/reject rules in data-model.md). Plain functions match the existing CommonJS style, add no runtime dependency (a stated constraint), are trivially unit-testable with Jest, and keep the diff reviewable. Existing handlers already use an early-`return` rejection pattern (e.g. `makeTurn` guards) — validators slot into that pattern naturally.

**Events to validate** (payload-bearing):
- `joinRoom` `{ player, room }` — `player` is an object with `id` (string) and `name` (string, 1–20 chars trimmed, allowed charset); `room` is a non-empty string of bounded length.
- `makeTurn` `(room, turn_data)` — `room` string; `turn_data.type` ∈ {`cardFromDeck`,`cardFromTop`,`cardFromHand`,`yaniv`}; `selected_cards` an array of valid in-hand indices (bounded by the player's hand length); `side` (for `cardFromTop`) a permitted value.
- `chatMessage` `(message)` — string, bounded length.
- `startGame` `()` — no payload, but currently crashes if `games[room]` is undefined (`games[room].eliminated = []`); add an existence guard.

Payload-less events (`spectatorJoin`, `rematchReady`, `leaveRoom`, `disconnect`) already guard `room`/`games[room]` existence; confirm and tighten only if a gap is found.

**Rejection semantics**: invalid input is rejected (early return), never auto-corrected, except player names which are trimmed before length/charset checks. Where the existing handler already has a client-facing error channel (`turnError`), reuse it; otherwise reject silently (drop the message) — a malicious client doesn't need feedback, and legitimate clients never send invalid payloads. Crucially, rejection must not throw and must not mutate game state.

**Alternatives considered**: `zod`/`joi` schema validation — rejected; adds a runtime dependency for ~4 small schemas, heavier than warranted. Validating inside each handler inline — rejected; centralizing in `validation.js` keeps handlers readable and makes the valid/invalid test matrix obvious.

## R4: XSS protection verification

**Decision**: Rely on React's default JSX escaping (already in place) and lock it in with a Vitest + @testing-library/react test that renders a name-displaying component with an injection payload and asserts the payload appears as literal text and creates no injected element. Add one Playwright e2e smoke covering an end-to-end name flow.

**Rationale**: All name render sites use `{player.name}` / a `name` prop into JSX (`lobby/index.jsx`, `round-result/index.jsx`, `opponent-area`), so React escapes them automatically — there is no `dangerouslySetInnerHTML` anywhere. The risk is a future regression (someone introduces raw HTML rendering), so the value is a guard test, not new escaping code. `round-result` or `opponent-area` is the cleanest unit target (already has sibling `*.test.jsx` files using Testing Library).

**Test assertion shape**: render with `name="<img src=x onerror=alert(1)>"` (or `<script>`); assert the literal string is found as text (`getByText`) and that `container.querySelector('img,script')` is null — i.e. the markup was not parsed into DOM nodes.

**Alternatives considered**: A scanning/fuzzing XSS tool — rejected; overkill for an auto-escaping React app with one user-controlled field. Sanitizing names server-side by stripping `<>` — rejected; per clarification, markup chars are allowed and neutralized at render, and stripping would mask whether escaping actually works.

## R5: CI lint gate wiring

**Decision**: Add a single `lint` job to `.github/workflows/ci.yml` that installs and lints both packages (two steps, or a matrix), running on the same `push`/`pull_request` triggers as the existing jobs. ESLint's default exit behavior (non-zero on errors, zero on warnings-only) already implements "fail on errors only," so no `--max-warnings` flag is needed.

**Rationale**: Mirrors the existing `client-unit`/`server-unit` job structure (per-package `npm ci` + script in `working-directory`). Keeping lint a separate job gives a clear, independent red/green signal. Default ESLint exit codes satisfy the errors-only clarification with no extra config.

**Alternatives considered**: Folding lint into the existing unit jobs — rejected; muddies the signal and couples lint failures to test runs. Adding `--max-warnings 0` — rejected; contradicts the "warnings allowed" clarification.

## Open items / flags for the user

- The two `no-undef` `navigate` fixes change behavior from "throws" to "navigates home." This is the intended behavior, but it's a real fix, not a no-op — surfaced here per the behavior-preservation principle.
- Whether to also add an e2e Playwright XSS smoke (R4) or keep XSS coverage to the unit test only — defaults to including a smoke per the project's "close each feature with an e2e smoke" practice; can be dropped if the user prefers.
