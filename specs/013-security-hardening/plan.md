# Implementation Plan: CI Hardening & Security

**Branch**: `013-security-hardening` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-security-hardening/spec.md`

## Summary

Three deliverables, in priority order: (1) clear the 14 existing ESLint errors in the client and add a CI lint gate that runs over **both** client and server and fails the build on errors only; (2) add a server-side validation layer at the Socket.io event boundary so malformed/hand-crafted messages are rejected without crashing the server or corrupting game state; (3) a targeted automated test proving user-controlled text (player names) renders as inert text, not executable markup.

Technical approach: keep it minimal and idiomatic to the existing codebase. No new runtime dependencies — validation is hand-rolled guard functions in a new `server/validation.js` module, wired into the existing handlers in `server/socket.js`. Server linting reuses the same ESLint already present in the client, via a new flat config + `lint` script in `server/`. Tests follow the existing split: Jest on the server, Vitest + Testing Library on the client.

## Technical Context

**Language/Version**: JavaScript (Node 22 in CI); client is ESM, server is CommonJS

**Primary Dependencies**: Client — React 19, Vite, ESLint (flat config, already present). Server — Express 4, Socket.io 4, Jest. No new runtime dependencies introduced; ESLint added to server as a dev dependency only.

**Storage**: N/A — game state is in-memory (`server/globals.js`); no database (SQLi explicitly out of scope)

**Testing**: Server — Jest (`server/tests/*.test.js`, plus `server/gameLogic.test.js`). Client — Vitest + @testing-library/react (`*.test.jsx`). E2E — Playwright (`playwright.config.ts`, PR-only job)

**Target Platform**: Linux server (Oracle Always-Free VM, pm2 + nginx); client served via Netlify CDN

**Project Type**: Web application (separate `client/` and `server/` packages)

**Performance Goals**: Validation must add negligible per-message overhead (synchronous guard checks, no I/O); no measurable impact on move latency

**Constraints**: No functional regression to legitimate gameplay; no new runtime dependency on the server; lint gate must be low-noise (errors fail, warnings allowed)

**Scale/Scope**: Small — ~10 socket event types, 3 client pages to clean, one in-memory game store. Public-facing server is the trust boundary.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unratified template with no concrete principles, so there are no formal gates to evaluate — **PASS by default**.

Applied working principles (from established project practice, not the empty constitution):
- **TDD**: failing tests written before implementation; validation gets valid+invalid cases per event; feature closes with an e2e smoke test.
- **Test-writing via the `tester` subagent.**
- **Small, focused commits**; user runs all git operations themselves.
- **Behavior preservation**: lint cleanup must not change how a legitimate game plays (see Phase 0 note on `no-undef` errors that are latent bugs).

No complexity deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/013-security-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — payload shapes + accept/reject rules (the validation contract)
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
client/
├── eslint.config.js               # exists — client lint config
├── package.json                   # has "lint": "eslint ."
└── src/
    ├── pages/
    │   ├── game/index.jsx         # most lint errors live here (incl. no-undef bugs)
    │   ├── home/index.jsx         # unused-vars
    │   └── lobby/index.jsx        # renders player.name
    ├── components/
    │   ├── opponent-area/         # renders name prop  → XSS test target
    │   └── round-result/          # renders winner.name → XSS test target
    └── pages/game/game.test.jsx   # unused-vars in test

server/
├── eslint.config.js               # NEW — flat config for CommonJS/Node
├── package.json                   # NEW "lint" script + eslint devDep
├── socket.js                      # event boundary — wire in validation guards
├── validation.js                  # NEW — pure payload-validation functions
├── gameLogic.js                   # unchanged
└── tests/
    └── validation.test.js         # NEW — valid+invalid cases per event

.github/workflows/
└── ci.yml                         # add a `lint` job (client + server)
```

**Structure Decision**: Existing two-package web layout is kept as-is. The only new source files are `server/eslint.config.js`, `server/validation.js`, and `server/tests/validation.test.js`, plus one client XSS test. `ci.yml` gains a lint job; the client lint config already exists and is reused conceptually for the server.

## Complexity Tracking

No constitution violations; table not applicable.
