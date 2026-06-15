# Implementation Plan: GitHub Actions CI Pipeline

**Branch**: `011-github-actions-ci` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-github-actions-ci/spec.md`

## Summary

Add a GitHub Actions workflow that runs the client Vitest suite and server Jest suite on every push and PR, and additionally runs the Playwright e2e suite only on PRs targeting `main`. Each suite reports a distinct status check. To make e2e runnable unattended on a headless runner, the Playwright config is updated to (a) start the server and client via a `webServer` block and (b) run headless without `slowMo` when the `CI` env var is set, preserving headed+slowMo locally. Node is pinned to 22 LTS; Playwright failure artifacts are uploaded.

## Technical Context

**Language/Version**: Node.js 22 LTS (CI-pinned); JavaScript/JSX (client), CommonJS (server), TypeScript (e2e specs)

**Primary Dependencies**: GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`), Vitest (client), Jest (server), `@playwright/test` (e2e)

**Storage**: N/A

**Testing**: Vitest (`client/`, `npm test`), Jest (`server/`, `npm test`), Playwright (`e2e/`, `npx playwright test` from repo root)

**Target Platform**: `ubuntu-latest` GitHub-hosted runners

**Project Type**: Web application (React client + Express/Socket.io server) — CI/infra change only, no app logic touched except Playwright config

**Performance Goals**: Unit-only runs (push) complete < 3 min; full PR runs (incl. e2e) complete < 10 min (SC-001)

**Constraints**: No paid third-party CI; no repo secrets required (SC-005); e2e must run fully unattended (headless, no human prompts)

**Scale/Scope**: One workflow file; 3 jobs (client-unit, server-unit, e2e); ~4 e2e spec files today, expected to grow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unfilled template with no ratified principles. No gates to evaluate. **PASS** (no violations possible).

Project conventions observed from prior features (CLAUDE.md, memory): TDD with a closing e2e smoke test, small focused commits, mark tasks `[x]` on completion. This feature is infrastructure (CI YAML + config), so the "failing test first" rule applies loosely — validation is the workflow running green on a PR.

## Project Structure

### Documentation (this feature)

```text
specs/011-github-actions-ci/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (workflow/job entities)
├── quickstart.md        # Phase 1 output (how to verify CI locally + on PR)
├── contracts/
│   └── ci-workflow.md   # Phase 1 output (trigger → job → check contract)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml           # NEW — the CI workflow (3 jobs, conditional e2e)

playwright.config.ts     # MODIFIED — add webServer block; CI-conditional headless/slowMo

client/                  # unchanged (npm test = vitest run)
server/                  # unchanged (npm test = jest)
e2e/                     # unchanged spec files; relies on webServer to boot app
```

**Structure Decision**: Single new workflow file under `.github/workflows/ci.yml` plus a surgical edit to the existing root `playwright.config.ts`. No application source code changes. Three independent jobs so each test tier reports its own status check and they run in parallel where possible.

## Complexity Tracking

No constitution violations. Section intentionally empty.
