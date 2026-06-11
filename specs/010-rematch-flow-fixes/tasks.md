# Tasks: Fix rematch-timer expiry + stale winner overlay

## Context

Two related bugs in the game-over / rematch flow, both caused by state that is
never cleared between games:

**Bug 1 — rematch timer starts a game instead of sending idle players home.**
When the round-result countdown reaches 0, the client auto-emits `rematchReady`
for players who never clicked the button
([round-result/index.jsx:13-15](../../client/src/components/round-result/index.jsx#L13-L15)).
That enrolls everyone, and the server's fallback timer
([socket.js:205-207](../../server/socket.js#L205-L207)) re-deals to **every**
player still in the room. So a new game always starts at expiry. Expected:
players who didn't click should be sent to the home page, and a rematch should
start only among players who clicked ready.

**Bug 2 — hosting/joining after a game shows the old winner overlay.**
`gameOverData` ([game-context.jsx:14](../../client/src/context/game-context.jsx#L14))
is never reset. `GameProvider` wraps the whole router
([App.jsx:8](../../client/src/App.jsx#L8)), so its state survives navigation
home. When the player then hosts/joins, the server's `start` event arrives while
the **Lobby** is mounted — the Game page's `handleStart` that clears
`gameOverData` ([game/index.jsx:44](../../client/src/pages/game/index.jsx#L44))
isn't listening yet — so Game mounts with stale `gameOverData` and renders the
old overlay ([game/index.jsx:250-256](../../client/src/pages/game/index.jsx#L250-L256))
instead of the board.

**Decided rematch rule (Bug 1):** at expiry, start a rematch with only the
players who clicked Rematch, but only if **≥2** are ready. Non-ready players are
dropped and sent home. If fewer than 2 are ready, cancel the rematch and send
everyone home.

**Workflow:** TDD — failing tests first (spawn the `tester` subagent for every
test task), implement to green, mark tasks `[x]` as completed, stop after each
phase with a short summary + suggested commit message.

---

## Phase 1 — Server: leave-room + ready-only rematch

- [x] **T001 [test]** Server tests (`server/tests/multiRound.test.js`, fast-timers):
  - A player who emits `leaveRoom` is removed from `rooms[room]` and
    `games[room].players`; remaining players keep playing; if the room empties
    the game is deleted and timers cleared.
  - Rematch timeout with 2 of 3 players ready → `start` fires with exactly the 2
    ready players in the dealt game (non-ready player dropped).
  - Rematch timeout with 1 of 3 ready → **no** `start`; remaining players receive
    a `rematchCancelled` (go-home) event and the room/game is cleaned up.
  - Keep existing T-MR4/4b/4c green (adjusting 4c if its expectation changes).

- [x] **T002** Add a `leaveRoom` socket handler in
  [server/socket.js](../../server/socket.js): mirror the non-disconnect cleanup
  from the `disconnect` handler
  ([socket.js:211-253](../../server/socket.js#L211-L253)) — remove from
  `rooms`/`players`, drop from `rematchReady`, emit `playerDisconnected`, advance
  the turn if it was theirs, and on empty room clear `rematchTimer` + delete the
  game. Factor the shared cleanup into a helper reused by both handlers.

- [x] **T003** Rework `startRematch()`
  ([socket.js:183-198](../../server/socket.js#L183-L198)) to be
  ready-authoritative: compute the ready players; if `< 2` ready, emit
  `rematchCancelled` to the room, clear rematch state, and delete the game/room;
  if `≥ 2`, remove every non-ready player from `rooms[room]` +
  `games[room].players` (and reset eliminated/scores as today) before
  `dealNewRound`. Keep the early "all ready" path
  ([socket.js:200-203](../../server/socket.js#L200-L203)).

---

## Phase 2 — Client: navigate home at expiry, leave the room

- [x] **T004 [test]** Component tests for `RoundResult`
  (`client/src/components/round-result/`): when the countdown hits 0 without a
  click it emits `leaveRoom` and navigates to `/` (and does **not** emit
  `rematchReady`); clicking Rematch still emits `rematchReady` and shows
  "Waiting…"; the "Go Home" button emits `leaveRoom` + resets game state +
  navigates home.

- [x] **T005** In
  [round-result/index.jsx:13-15](../../client/src/components/round-result/index.jsx#L13-L15),
  replace the `timeLeft <= 0 → socket.emit('rematchReady')` branch with
  `socket.emit('leaveRoom')` + `navigate('/')`. Make the "Go Home" button
  ([line 42](../../client/src/components/round-result/index.jsx#L42)) and the
  spectator "Exit"/leave paths emit `leaveRoom` and call `resetGame()` (from
  Phase 3) before navigating. Align the client countdown start value
  ([line 8](../../client/src/components/round-result/index.jsx#L8), currently
  `10`) with the server's `REMATCH_TIMEOUT_MS`.

- [x] **T006** Add a `rematchCancelled` listener (in the Game page or context)
  that clears game-over state and navigates the player home, so the cancel path
  from T003 lands them on the home page.

---

## Phase 3 — Client: reset state between games (fixes Bug 2)

- [ ] **T007 [test]** Context/integration test: after `gameOverData` is set,
  calling `resetGame()` returns all per-game fields to their initial values; and
  a `start` event clears `gameOverData` even when the Game page was not
  previously mounted.

- [ ] **T008** Add `resetGame()` to
  [game-context.jsx](../../client/src/context/game-context.jsx) that resets
  `player`, `players`, `gameState`, `gameStarted`, `sum`, `selectedCards`,
  `gameOverData`, `isSpectator`, `handSizes`, `opponentScores` to their initial
  values; expose it via context. Also clear `gameOverData` inside the
  context-level `handleStart`
  ([game-context.jsx:44-50](../../client/src/context/game-context.jsx#L44-L50))
  so the always-mounted listener authoritatively dismisses the overlay on any new
  game.

- [ ] **T009** Call `resetGame()` at the top of `hostGameClicked` and
  `joinGameClicked` in [home/index.jsx](../../client/src/pages/home/index.jsx) so
  a fresh session never inherits the previous game's `gameOverData`/`gameStarted`
  (the latter also prevents Lobby from instantly bouncing to `/game`).

---

## Phase 4 — e2e smoke

- [ ] **T010 [test]** Playwright spec under [e2e/](../../e2e/): (a) 2-player game
  ends, one clicks Rematch and the other lets the timer expire → the idle player
  lands on the home page and the ready player is sent home (cancelled, since <2
  remain); a 3-player variant where 2 click Rematch → a new 2-player game starts.
  (b) After a game ends, a player goes Home and hosts a new game → the board
  renders, no stale winner overlay.

---

## Verification

- `cd server && npm test` (Jest, fast-timers) — Phase 1 green, existing
  multiRound suite still green.
- `cd client && npm test` (Vitest) — Phases 2–3 green.
- `npx playwright test` — Phase 4 green.
- Manual: start a 2-player game, finish it; let the timer expire on one client →
  it goes home; the other (if it clicked) ends up home too (cancelled). Then host
  a new game from home → board renders with no leftover overlay.

## Notes / risks

- Client and server both run a ~10s timer; making the server ready-authoritative
  (T003) keeps the server the source of truth and tolerates client/server timer
  races. The client `leaveRoom` (T005) just makes the common case immediate.
- The 12s/15s observed vs. the `10000` default in
  [config.js:3](../../server/config.js#L3) suggests a `REMATCH_TIMEOUT_MS` env
  override; T005 keeps the displayed countdown matched to it.
