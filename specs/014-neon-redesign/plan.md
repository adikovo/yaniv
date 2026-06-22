# Implementation Plan: Neon-Syndicate Visual Redesign

**Branch**: `014-neon-redesign` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-neon-redesign/spec.md`

## Summary

Re-skin the entire client to a "neon-syndicate" (dark cyberpunk) aesthetic using the Figma Make export (`client/Design YANIV Game Screen/`) as the visual reference. The menu/setup screens (welcome, host, join, lobby) adopt the reference layout + theme and gain its missing nav controls (Back, Leave Lobby, copy Game ID) plus the animated CSS background. The game screen keeps its existing structure and positioning but is re-themed (dark neon table replacing green felt, higher contrast, bigger cards/piles, decluttered) with a fixed-size active-seat highlight, a Home button + leave-confirmation dialog, and an eliminated-seat de-emphasis. All shared components and overlays (cards, opponent seats, round-result/rematch, spectator prompt, disconnect notice, callouts) are restyled too.

This is a **client-only, presentation-layer** feature. No game rules, server logic, or socket contracts change. The single behavioral additions (Leave Lobby, in-game leave) reuse the existing `leaveRoom` socket event. Card faces keep the existing PNG deck — the neon look is a frame around the image, not a card-renderer rewrite.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 19, JSX

**Primary Dependencies**: React 19, react-router-dom 7, socket.io-client 4, Vite. New: web fonts (Orbitron, Space Mono, Inter); `lucide-react` for icons (small, tree-shakeable) — alternative is inline SVG.

**Storage**: N/A (no persistence; in-memory server state unchanged)

**Testing**: Vitest + React Testing Library (client unit/component), Playwright (e2e smoke). TDD via the `tester` subagent for new test work.

**Target Platform**: Modern evergreen browsers (desktop primary; existing responsive behavior preserved)

**Project Type**: Web application (client `client/`, server `server/`) — this feature touches the client only.

**Performance Goals**: Maintain smooth UI; background animations are CSS-only (GPU-friendly transforms/opacity), no JS animation loop. No regression to current load/interaction responsiveness.

**Constraints**:
- The reference export folder is reference-only — it MUST NOT be imported, bundled, or linted as part of the app build.
- No Tailwind / shadcn / MUI — reimplement in the existing per-component plain `styles.css` approach.
- No new animation library in 014 (background = CSS keyframes). A motion library is deferred to feature 015.
- No regression to the existing lint gate (US1 of feature 013) or test suite.

**Scale/Scope**: 3 pages (5 screen states) + 5 shared components + 1 inline notice + 1 new dialog. ~2–8 supported players per game.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is the unfilled template — no ratified principles to gate against. In their place, this plan honors the project's established de-facto conventions (from `CLAUDE.md` and prior features):

- **TDD where it adds value**: behavior-bearing changes (Leave Lobby/Home leave wiring, fixed-highlight invariant, XSS no-regression) get tests via the `tester` subagent; pure cosmetic CSS does not require unit tests (verified via Playwright smoke + visual check).
- **Small, focused commits**, suggested when >~3 files change; user runs all git.
- **Lint gate stays green** (errors only) — the reference export folder is excluded from lint/build.
- **No new game-rule or server-contract changes** — keeps the feature low-risk and reversible.

**Result**: PASS (no violations; Complexity Tracking not required).

## Project Structure

### Documentation (this feature)

```text
specs/014-neon-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

**Intentionally skipped Phase-1 artifacts** (presentation-only feature):
- `data-model.md` — no domain entities; only trivial transient UI state (`showLeaveDialog`, `copied`), already noted in the plan.
- `contracts/` — no external interface; UI behavior is already captured by the spec's acceptance scenarios.
- `quickstart.md` — verification is covered by the spec's acceptance scenarios + `/run`.

### Source Code (repository root)

```text
client/
├── index.html                       # add web-font <link>s (Orbitron/Space Mono/Inter)
├── src/
│   ├── index.css                    # NEW shared theme tokens (palette, glow, glass, fonts) + reset
│   ├── App.css                      # trim/replace legacy Vite defaults
│   ├── styles/
│   │   └── theme.css                # (optional) central neon tokens + keyframes + utility classes
│   ├── components/
│   │   ├── particle-grid/           # NEW — animated CSS background (menu screens)
│   │   │   ├── index.jsx
│   │   │   └── styles.css
│   │   ├── leave-dialog/            # NEW — neon "Leave the game?" confirm dialog
│   │   │   ├── index.jsx
│   │   │   └── styles.css
│   │   ├── card/                    # restyle: neon frame around existing PNG (no logic change)
│   │   │   ├── index.jsx
│   │   │   └── styles.css
│   │   ├── opponent-area/           # restyle: fixed seat zone, active highlight, eliminated state
│   │   │   ├── index.jsx
│   │   │   └── styles.css
│   │   ├── round-result/            # restyle (neon)
│   │   ├── spectator-prompt/        # restyle (neon)
│   │   └── call-out/                # restyle (neon)
│   └── pages/
│       ├── home/                    # welcome/host/join restyle + Back controls + animated bg
│       │   ├── index.jsx
│       │   └── styles.css
│       ├── lobby/                   # restyle + copy-Game-ID + Leave Lobby + animated bg
│       │   ├── index.jsx
│       │   └── styles.css
│       └── game/                    # restyle: dark table, header (wordmark + Home), leave dialog
│           ├── index.jsx
│           └── styles.css
└── public/cards/                    # unchanged (existing PNG deck)

server/                              # UNCHANGED (reuse existing leaveRoom event)

.gitignore                           # add: client/Design YANIV Game Screen/
```

**Structure Decision**: Web app; **client-only** changes. Reuse the existing per-component `index.jsx` + `styles.css` pattern. Introduce ONE shared theme layer (tokens, keyframes, glow/glass utility classes) so all screens/components draw from the same neon primitives instead of duplicating values. Two new components: `particle-grid` (animated background) and `leave-dialog` (confirmation). Card visuals change via CSS only — `card/index.jsx` keeps rendering the PNG `<img>`.

## Complexity Tracking

No constitution violations — section intentionally empty.
