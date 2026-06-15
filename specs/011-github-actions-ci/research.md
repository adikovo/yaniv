# Phase 0 Research: GitHub Actions CI Pipeline

All clarifications from the spec are resolved. This document records the technical decisions and the rationale behind them.

## Decision 1: Workflow trigger split (unit vs e2e)

**Decision**: One workflow file with `on: [push, pull_request]`. Unit jobs run on all events. The e2e job is gated with `if: github.event_name == 'pull_request'`.

**Rationale**: Developer flow is push → PR → self-merge. Unit tests (~30s) give fast feedback on every push; the slow e2e suite (multiple browser contexts, 2/3/4-player scenarios) only needs to gate the PR before merge. Matches spec FR-001–FR-004 and the 2026-06-11 clarification.

**Alternatives considered**: e2e on every push (rejected — too slow during active dev); e2e on nightly cron (rejected — slower feedback on regressions, and user has no separate dev branch).

## Decision 2: Job topology

**Decision**: Three independent jobs — `client-unit`, `server-unit`, `e2e` — each its own status check. Unit jobs run in parallel; `e2e` has no `needs` dependency (it boots its own app), so it also runs in parallel on PRs.

**Rationale**: FR-005 requires distinct status checks per suite. Independent jobs give clear, separately-restartable checks and parallelism. e2e booting its own server/client means it doesn't depend on the unit jobs.

**Alternatives considered**: Single job with sequential steps (rejected — one combined check, no parallelism, harder to read failures).

## Decision 3: Starting server + client for e2e

**Decision**: Add a `webServer` array to `playwright.config.ts` with two entries:
- Server: `command: npm start` (cwd `server/`), `url: http://localhost:3000`, `reuseExistingServer: !process.env.CI`.
- Client: `command: npm run dev` (cwd `client/`), `url: http://localhost:5173`, `reuseExistingServer: !process.env.CI`.

Playwright waits for both URLs before running tests and tears them down after.

**Rationale**: FR-008. Keeping startup in the Playwright config (not the workflow YAML) means `npx playwright test` works identically locally and in CI — single source of truth. The server listens on `process.env.PORT || 3000`; the Vite client uses its default 5173. Both match the hardcoded values in [e2e/helpers.ts](../../e2e/helpers.ts) (`BASE`, `SERVER_BASE`).

**Alternatives considered**: Background processes started in the workflow YAML with a `wait-on` step (rejected — duplicates startup logic, only works in CI, drifts from local usage).

**Open detail for tasks**: Vite may need `--host`/strict port; default `npm run dev` binds 5173. If the runner ever reports port-in-use, add `strictPort` — noted, not blocking.

## Decision 4: Headless in CI, headed locally

**Decision**: In `playwright.config.ts`, derive from `process.env.CI`:
- `headless: !!process.env.CI` (true in CI, false locally)
- `launchOptions.slowMo: process.env.CI ? 0 : 400`

**Rationale**: FR-009. GitHub runners have no display; headed mode would fail (or need xvfb) and `slowMo: 400` would make the suite needlessly slow. `CI=true` is set automatically by GitHub Actions, so no manual config. Local debugging UX (headed + slowMo) is preserved.

**Alternatives considered**: Permanently headless (rejected — user wants headed local debugging); separate `playwright.ci.config.ts` (rejected — second file to keep in sync).

## Decision 5: Node version & dependency install

**Decision**: Pin Node 22 via `actions/setup-node@v4` with `node-version: 22` in every job. Install deps per-directory with `npm ci` (client and server each have their own lockfile-backed `package.json`; root has `package-lock.json` covering `@playwright/test`). Use `cache: npm` keyed on the relevant lockfile(s).

**Rationale**: FR-007, FR-010. `npm ci` is reproducible and CI-appropriate. Node 22 LTS is stable and well-supported (local is non-LTS v25). Caching speeds repeat runs.

**Alternatives considered**: `npm install` (rejected — non-deterministic); single root install (rejected — client/server have separate dependency trees).

## Decision 6: Playwright browser install

**Decision**: In the e2e job, run `npx playwright install --with-deps chromium` after `npm ci`.

**Rationale**: Runners don't have Playwright browsers pre-cached. `--with-deps` pulls the needed OS libraries. Chromium-only keeps install time down (config doesn't define multiple projects/browsers).

**Alternatives considered**: Install all browsers (rejected — slower, unused); rely on cache only (rejected — not guaranteed present).

## Decision 7: Failure artifacts

**Decision**: In the e2e job, add `actions/upload-artifact@v4` with `if: failure()` (or `always()` for trace) uploading `test-results/` and the Playwright HTML report. Set artifact `retention-days: 7`.

**Rationale**: FR-012, SC-004. The repo already produces `test-results/`. Uploading on failure lets you inspect traces/screenshots from the PR without reproducing locally.

**Open detail for tasks**: Add `reporter: [['html'], ['list']]` and `trace: 'on-first-retry'` (or `retain-on-failure`) to the config so artifacts exist. Currently the config defines no reporter/trace — to be added in the config edit task.

## Decision 8: Concurrency

**Decision**: Add a `concurrency` group keyed on workflow + ref with `cancel-in-progress: true`.

**Rationale**: Avoids stacked runs when pushing several commits quickly to an open PR; saves CI minutes. Low risk for a solo developer.

**Alternatives considered**: No concurrency control (acceptable but wasteful on rapid pushes).
