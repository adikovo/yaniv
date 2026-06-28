# Research: Lobby Leave/Disconnect Broadcast

Phase 0 — resolve how the pre-game lobby actually behaves and choose the fix.

## Decision 1 — Why the lobby roster goes stale (corrected mechanism)

**Decision**: The bug is "the lobby departure path emits the wrong events," not "the removal block is skipped."

**Investigation**:
- `games[gameID]` is created at HTTP `GET /host` (`server/routes/game.js:33`, `games[gameID] = {"players": {}}`), and `GET /join` adds each joiner to `games[gameID].players` (`server/routes/game.js:61`) — all **before** the game starts.
- So in the lobby, `games[room]` is truthy and lobby players are present in `games[room].players`. The gate `if (games[room] && player && games[room].players[player.id])` (`server/socket.js:263`) therefore **runs** during the lobby — emitting `playerDisconnected` and, when one player remains, `gameOver`.
- The lobby UI renders its roster from `players` in context, updated **only** by `playersUpdate` (`client/src/context/game-context.jsx:32-36`; rendered at `client/src/pages/lobby/index.jsx:54`). `playerDisconnected` and `gameOver` are handled only on the game page (`client/src/pages/game/index.jsx:77-79`), which is not mounted in the lobby.
- Result: the remaining lobby members never receive a `playersUpdate`, so the roster is stale; the `gameOver`/`playerDisconnected` emitted into the lobby are silently ignored.

**Rationale**: Verified directly against `server/routes/game.js`, `server/socket.js`, and the client lobby/context — supersedes the earlier (incorrect) note that `games[room]` is created at `startGame`.

**Alternatives considered**: Treating it as a client bug (make the lobby listen to `playerDisconnected`) — rejected: the lobby's data source is `playersUpdate`, and the server should send the correct roster event rather than the lobby reconstructing state from a disconnect signal.

## Decision 2 — Discriminator for "lobby vs in-game"

**Decision**: Use `games[room].game_state` (absent in the lobby, present once the game starts).

**Rationale**: `game_state` is created by `dealNewRound` at `startGame` (`server/gameLogic.js:38-39`); `games[room]` itself exists from `/host`. So `game_state` is the reliable "has the game started?" signal. `games[room]` existence is not (it's true throughout the lobby).

**Alternatives considered**: Adding a new explicit `started` flag — rejected as unnecessary state when `game_state` already encodes it.

## Decision 3 — Fix shape (Approach A: clean branch)

**Decision**: In `removePlayer`, add a pre-start branch: when `games[room]` exists but `!games[room].game_state`, delete the leaver from `games[room].players`, emit `playersUpdate` with `Object.values(rooms[room])`, and return — skipping the in-game disconnect logic. Leave the in-game path unchanged.

**Rationale**: Fixes the stale roster **and** stops the spurious `gameOver`/`playerDisconnected` from being emitted into the lobby. Reuses the existing `playersUpdate` event and payload shape (same as the join handler at `server/socket.js:40`), so the client needs no change. Marginally more code than a bare "also emit `playersUpdate`" append, but leaves the server behaving correctly.

**Alternatives considered**: Approach B (minimal append — keep the existing block and additionally emit `playersUpdate`) — rejected by the user: it fixes the roster but leaves misleading `gameOver`/`playerDisconnected` traffic in the lobby that could bite if the lobby ever listens to those events.

## Decision 4 — Test strategy

**Decision**: New Jest file `server/tests/lobbyLeave.test.js` on the real Socket.io harness (`helpers/setup.js`); each test forces the pre-start state by `delete games[gameID].game_state` before exercising leave/disconnect.

**Rationale**: `createTestServer` seeds a started game (it builds `game_state`), so tests must drop `game_state` to reach the lobby branch. Mirrors the existing `disconnect.test.js` style (real clients, event assertions). A post-start regression case keeps FR-006 (in-game behavior unchanged) honest.
