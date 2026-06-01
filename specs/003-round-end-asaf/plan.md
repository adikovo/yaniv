# Implementation Plan: Round End Event & Asaf Detection

**Branch**: `003-round-end-asaf` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

## Summary

Implement round end detection: when a player calls Yaniv, the server resolves the round (Asaf check, score update), emits a `roundEnd` event to all clients, and renders a result screen. Players have 15 seconds to click "Next Round" — those who don't are dropped. A new round starts with whoever clicked (minimum 2 players). Players with score > 100 are eliminated. Asaf penalty is 30 + caller's hand sum.

## Technical Context

**Language/Version**: Node.js (server), React 19 (client)

**Primary Dependencies**: Express, Socket.io (server) · React, Socket.io-client, React Router (client)

**Storage**: In-memory via `globals.js` (`games` object)

**Testing**: Jest + socket.io-client (server integration tests)

**Target Platform**: Local multiplayer, browser

**Project Type**: Real-time multiplayer web game

**Performance Goals**: `roundEnd` event received by all clients within 1 second of Yaniv call

**Constraints**: No database — all state in memory. Round restart must work with 2+ players.

**Scale/Scope**: Small local multiplayer (2–6 players per room)

## Constitution Check

Constitution template is unfilled — no gates defined. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-round-end-asaf/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
server/
├── gameLogic.js         ← modify yanivCall, add eliminatePlayers, add score init
├── socket.js            ← modify yaniv handler, add readyForNextRound handler
└── tests/
    └── roundEnd.test.js ← new integration tests

client/src/
├── pages/
│   └── game/
│       └── index.jsx    ← wire roundEnd + nextRound socket events
└── components/
    └── round-result/    ← new RoundResult component
        ├── index.jsx
        └── styles.css
```

## Complexity Tracking

No constitution violations — section not applicable.
