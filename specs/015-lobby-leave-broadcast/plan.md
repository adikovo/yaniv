# Implementation Plan: Lobby Leave/Disconnect Broadcast

**Branch**: `015-lobby-leave-broadcast` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-lobby-leave-broadcast/spec.md`

## Summary

When a player leaves (via the Leave Lobby button) or disconnects while the room is still in the **pre-game lobby**, the other waiting players' rosters never update. The fix is a small, server-only change in `removePlayer` (`server/socket.js`): detect the pre-start case and emit the existing `playersUpdate` event with the remaining roster, instead of running the in-game departure logic.

**Corrected mechanism (the recorded premise was wrong).** The original note assumed `games[room]` does not exist until `startGame`, so the removal block at `server/socket.js:263` was thought to be skipped in the lobby. In reality `games[room]` is created at HTTP `/host` (`server/routes/game.js:33`) and `/join` adds each player into `games[room].players`, so during the lobby the block **does** run — it emits `playerDisconnected` and (when one player remains) `gameOver`. The lobby UI listens to **neither**; it renders its roster solely from `playersUpdate` (`client/src/context/game-context.jsx:32`, consumed at `client/src/pages/lobby/index.jsx:54`). So the roster goes stale, and a spurious `gameOver`/`playerDisconnected` is fired into the lobby (currently harmless only because the lobby ignores them).

**The real discriminator** between lobby and in-game is `games[room].game_state`, which is absent until `dealNewRound` creates it (`server/gameLogic.js:38-39`) at `startGame` — not `games[room]` existence.

**Chosen approach (A — clean branch).** In `removePlayer`, when the game has not started (`games[room]` exists but `!games[room].game_state`), emit `playersUpdate` with `Object.values(rooms[room])` and skip the in-game disconnect logic entirely. The post-start path is left byte-for-byte unchanged. This both fixes the stale roster and stops the spurious in-lobby `gameOver`/`playerDisconnected` emits.

## Technical Context

**Language/Version**: JavaScript — server is CommonJS on Node 22 (CI); client is ESM React 19

**Primary Dependencies**: Server — Express 4, Socket.io 4, Jest. No new runtime or dev dependencies introduced.

**Storage**: N/A — game/room state is in-memory (`rooms` in `server/socket.js`, `games`/`gameIds` in `server/globals.js`); no database.

**Testing**: Server — Jest (`server/tests/*.test.js`) using the real HTTP + Socket.io harness in `server/tests/helpers/setup.js`. Client is unaffected (no client change required). Optional e2e — Playwright (PR-only job).

**Target Platform**: Linux server (Oracle Always-Free VM, pm2 + nginx); client via Netlify CDN.

**Project Type**: Web application (separate `client/` and `server/` packages). This feature touches **server only**.

**Performance Goals**: Negligible — one extra synchronous `emit` on departure; no I/O, no added latency.

**Constraints**: Zero change to in-game (post-start) departure behavior; no new dependencies; reuse the existing `playersUpdate` event (do not invent a new one).

**Scale/Scope**: Tiny — one branch added to one function, plus a server test. Pre-game lobby only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unratified template with no concrete principles, so there are no formal gates — **PASS by default**.

Applied working practices (from established project habit, not the empty constitution):
- **TDD**: a failing Jest test for the pre-start leave/disconnect case is written before the `removePlayer` change.
- **Minimal, idiomatic diffs**: reuse `playersUpdate` and the existing `Object.values(rooms[room])` payload shape already used by the join handler (`server/socket.js:40`) and rematch (`:318`).
- **No scope creep**: in-game path untouched; no client changes.

**Post-design re-check**: still PASS — the design adds no architecture, dependencies, or cross-cutting concerns.

## Project Structure

### Documentation (this feature)

```text
specs/015-lobby-leave-broadcast/
├── plan.md              # This file
├── research.md          # Phase 0 — mechanism correction + approach decision
├── spec.md              # Feature spec
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

`data-model.md`, `contracts/`, and `quickstart.md` are intentionally omitted: there is no new data model, the only "contract" is the already-existing `playersUpdate` event (unchanged shape: `{ players: Player[] }`), and the change is too small to warrant a separate quickstart.

### Source Code (repository root)

```text
server/
├── socket.js                 # removePlayer() — add the pre-start branch (the only production change)
├── routes/game.js            # (reference only) where games[room] is created — confirms the corrected mechanism
├── gameLogic.js              # (reference only) game_state is created here at startGame
└── tests/
    ├── helpers/setup.js      # (reference only) real HTTP + Socket.io test harness
    └── lobbyLeave.test.js    # NEW — pre-start leave/disconnect → remaining members get playersUpdate
```

**Structure Decision**: Single-file production change in `server/socket.js`, plus one new Jest test file. No client changes; the lobby already re-renders from `playersUpdate`.

## Implementation Approach (detail)

In `removePlayer(room, socketId)` (`server/socket.js:245`), after `cleanupRoomIfEmpty(room)` returns false (room still has members), insert a pre-start branch **before** the existing in-game block:

```text
if room still has members AND games[room] exists AND NOT games[room].game_state:
    // pre-game lobby: keep games[room].players in sync, then tell remaining members
    delete games[room].players[player.id]   // keep the lobby roster authoritative for startGame
    io.to(room).emit("playersUpdate", { players: Object.values(rooms[room]) })
    return player
```

Notes / decisions:
- Payload source is `rooms[room]` (socket-keyed live roster), matching the join handler's `playersUpdate` exactly — so the lobby roster stays consistent with how it was first populated.
- We still delete the leaver from `games[room].players` so a subsequent `startGame` deals only to players actually present (parity with the in-game block's bookkeeping).
- The leaver is excluded automatically: they have already left the socket room (`leaveRoom`) or disconnected, so `io.to(room)` does not reach them, and they are removed from `rooms[room]` at the top of `removePlayer`.
- The existing in-game block (`playerDisconnected`, `gameOver`, `nextTurn`) is unchanged and now only reached when `game_state` exists.

## Testing Approach

New Jest file `server/tests/lobbyLeave.test.js`, using `createTestServer` from `helpers/setup.js`. Because the helper seeds a started game (it sets up `game_state`), each test must put the room into the **pre-start** state first by removing `game_state` (e.g. `delete games[gameID].game_state`) so `removePlayer` takes the lobby branch.

Planned cases:
1. **Leave (3 players)** — three clients in a pre-start room; one emits `leaveRoom`; the other two receive `playersUpdate` whose `players` excludes the leaver.
2. **Disconnect (3 players)** — same setup; one client disconnects; remaining two receive `playersUpdate` excluding it.
3. **No spurious events** — on a pre-start leave, remaining clients do **not** receive `gameOver` (and `playerDisconnected` is not used to drive the lobby).
4. **Last player leaves** — single client leaves an otherwise-empty pre-start room; room is cleaned up, no error, no broadcast needed.
5. **In-game regression guard** — with `game_state` present, a disconnect still emits `playerDisconnected`/`gameOver` as before (lock in FR-006).

## Complexity Tracking

No constitution violations; no entries required.
