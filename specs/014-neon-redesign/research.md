# Phase 0 Research: Neon-Syndicate Visual Redesign

All open questions from the spec's Clarifications session are resolved. This document records the technical decisions that shape Phase 1.

## R1 — Theme implementation strategy

**Decision**: Introduce a single shared theme layer (CSS custom properties for the palette + reusable glow/glass/keyframe definitions) loaded globally, then have each component/page consume those tokens in its own `styles.css`.

**Rationale**: The reference repeats the same palette (cyan `#00f0ff`, magenta `#ff2e97`, purple `#9b5fff`), glow recipes, and glass-panel treatment across every screen. Centralizing them as tokens avoids copy-paste drift, makes the "consistent theme" requirement (FR-001) verifiable, and keeps per-component CSS small. Matches the existing per-component `styles.css` convention rather than introducing Tailwind.

**Alternatives considered**: (a) Inline styles per component as the export does — rejected: duplicated magic numbers, not how this app is structured. (b) Adopt the export's Tailwind/shadcn toolchain — rejected: large dependency/tooling change, conflicts with the existing lint gate and plain-CSS approach.

## R2 — Card faces in the neon theme

**Decision**: Keep the existing PNG deck (`client/public/cards/`); apply the neon look as a CSS frame around the `<img>` (dark rounded border, neon glow, lift + glow on selection). `card/index.jsx` keeps its current filename-mapping logic.

**Rationale**: Preserves face-card art and joker handling, requires no renderer rewrite, lowest risk. (Recorded as FR-012a.)

**Alternatives considered**: (a) CSS-drawn cards like the export — rejected: loses J/Q/K art, no joker support, more work. (b) Source a new themed image deck — rejected: 54 new assets, slowest to start. (Both remain possible future polish.)

## R3 — Background animation

**Decision**: Reproduce the reference's animated background (drifting grid, floating orbs, scanlines) as CSS `@keyframes` in a dedicated `particle-grid` component, used on the menu/setup screens only. The game page uses static radial-gradient glows (no animation).

**Rationale**: The reference itself is CSS-only (no library) — confirmed in `App.tsx` (`ParticleGrid` + the keyframes block). CSS transforms/opacity are GPU-cheap. Keeping the game page static keeps gameplay distraction-free and preserves a clean boundary with feature 015 (all board/card motion lives there). (Recorded in Clarifications + FR-015.)

**Alternatives considered**: Canvas particle engine (tsparticles/WebGL) — rejected: adds a dependency + bundle weight, diverges from the reference, marginal gain for an ambient backdrop. A motion library (Framer Motion) — deferred to 015 for card motion.

## R4 — Fonts

**Decision**: Add Orbitron (display/wordmark), Space Mono (labels/mono accents), and Inter (body) via `<link>` tags in `index.html` (Google Fonts), with system-font fallbacks. Set Inter as the base family (it already appears as the first fallback in `index.css`).

**Rationale**: Matches the reference typography exactly with minimal setup and no build changes. `<link>` is the simplest reliable delivery; fallbacks prevent FOIT/layout shift.

**Alternatives considered**: Self-hosting via `@fontsource` packages — viable and more privacy/perf-robust, but adds dependencies; can be a later optimization. Inline `@font-face` with local files — more asset management for no near-term benefit.

## R5 — Icons

**Decision**: Use `lucide-react` for the handful of icons the reference uses (Home, Copy, Check, ChevronLeft/Back, Crown, Wifi). Tree-shakeable; only imported icons ship.

**Rationale**: The reference already uses `lucide-react`; it's tiny per-icon and idiomatic for React. Avoids hand-maintaining SVG markup.

**Alternatives considered**: Inline SVG — zero dependency but more verbose/duplicated; acceptable fallback if we want to avoid any new dependency. Decision is low-stakes and reversible.

## R6 — Active-seat highlight fix (no shrinking)

**Decision**: Move the active-turn highlight (border/glow/pulse) from wrapping the cards to wrapping a **fixed-size seat panel**. The seat panel has a stable min-width/height; the card fan lives inside it. Same approach the reference's `OpponentSeat` uses (the pulse is on the seat `<div>`, not the hand).

**Rationale**: Directly satisfies FR-009/SC-004 — the highlight no longer tracks hand size. The reference demonstrates the exact structure to mirror. Applies to both opponent seats and the local-player area.

**Alternatives considered**: Keep highlight on the hand but enforce a min-width — fragile, still couples highlight to content. Rejected.

## R7 — Leave Lobby / in-game leave behavior

**Decision**: Both the lobby's Leave Lobby control and the game's Home-confirm "Yes" emit the existing `leaveRoom` socket event, then navigate to welcome (`/`). The Home dialog "No" simply closes the dialog.

**Rationale**: The server already implements `leaveRoom` (server/socket.js:207) with shared removal logic (same path as disconnect), so no server change is needed for a clean exit. Note: the current in-game `handleLeave` navigates without emitting `leaveRoom`, leaving the socket in the room — wiring it to emit `leaveRoom` is a small correctness improvement aligned with FR-011/FR-016.

**Alternatives considered**: Add a new dedicated server event — rejected: unnecessary, `leaveRoom` already does this. Navigate without emitting — rejected: leaves a stale room membership.

## R8 — Keeping the reference export out of the build

**Decision**: Add `client/Design YANIV Game Screen/` to `.gitignore` (or relocate it outside `client/`), and ensure Vite/ESLint do not include it. Confirm the lint/build globs don't pick it up.

**Rationale**: It carries its own Tailwind/shadcn/TS deps that would break lint/build and bloat the tree. It is reference-only (Assumptions). User runs git; this plan only flags the change.

**Alternatives considered**: Leave it tracked under `client/` — rejected: pollutes build/lint and the repo.

## R9 — Testing approach

**Decision**:
- **Component/unit (Vitest + RTL)**: assert behavior, not pixels — e.g. Leave dialog renders on Home click, "No" keeps the game mounted, "Yes" triggers navigation + `leaveRoom`; eliminated seat gets its de-emphasis class; the existing XSS guard for player names still passes; copy-Game-ID writes to clipboard.
- **e2e (Playwright)**: a smoke pass through welcome → host → lobby → game confirming each screen renders and the core flow still works after the restyle (closes the feature per the project's TDD convention).
- **Not unit-tested**: pure cosmetic CSS (colors, glow, fonts) — verified visually + via the Playwright smoke and the manual quickstart.

**Rationale**: Matches the project's TDD-where-it-matters convention; avoids brittle pixel/snapshot tests for a visual feature while still guarding the behavioral additions and the highlight invariant.

**Alternatives considered**: Visual regression snapshots — high maintenance for an intentionally large visual change; out of scope.
