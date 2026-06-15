# Feature Specification: GitHub Actions CI Pipeline

**Feature Branch**: `011-github-actions-ci`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Set up CI using GitHub Actions for the Yaniv card game project. The CI pipeline should run on every push and PR to main, executing: client Vitest unit tests, server Jest unit tests, and Playwright e2e tests. It should report pass/fail status on PRs."

## Clarifications

### Session 2026-06-11

- Q: When should the Playwright e2e suite run? → A: On PRs targeting `main` only; unit tests run on all push + PR events (developer flow is push → PR → self-merge, so e2e gates the PR before merge).
- Q: The Playwright config runs headed (`headless: false`) with `slowMo: 400` — how should CI handle this? → A: CI-conditional — config detects an env var (e.g. `CI`) and runs headless without slowMo in CI, while keeping headed+slowMo for local debugging.
- Q: How should the server (port 3000) and client (port 5173) be started before e2e tests? → A: Add a Playwright `webServer` block so Playwright starts both and waits for their ports (reusable locally, auto torn down after the run).
- Q: Which Node.js version should CI pin? → A: 22 LTS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unit Tests Run on Every PR (Priority: P1)

A developer opens a pull request targeting `main`. The CI pipeline automatically runs the client Vitest suite and the server Jest suite and reports pass/fail inline on the PR before any merge is allowed.

**Why this priority**: Prevents regressions from landing in main; the fastest feedback loop for reviewers and contributors.

**Independent Test**: Can be tested independently by opening a PR and observing that status checks appear and reflect actual test outcomes.

**Acceptance Scenarios**:

1. **Given** a PR is opened against `main`, **When** the CI workflow triggers, **Then** both the client unit tests and server unit tests run and their results are reported as separate status checks on the PR.
2. **Given** a test failure exists in the client or server suite, **When** CI runs, **Then** the corresponding check is marked failed and the PR cannot be merged until fixed.
3. **Given** all unit tests pass, **When** CI runs, **Then** both checks are marked green and merge is unblocked (assuming no other checks fail).

---

### User Story 2 - E2E Tests Run on Every PR (Priority: P2)

The same PR pipeline also runs the Playwright end-to-end suite against a locally started server and client, reporting pass/fail as a third status check.

**Why this priority**: E2E tests catch integration issues that unit tests miss; required for confidence before merging game-flow changes.

**Independent Test**: Can be verified independently by checking that the e2e status check appears and reflects Playwright results.

**Acceptance Scenarios**:

1. **Given** a PR is opened, **When** CI triggers, **Then** the Playwright e2e suite runs against a locally started server + client and results appear as a status check.
2. **Given** an e2e test fails (e.g., rematch flow), **When** CI runs, **Then** the e2e check is marked failed, surfacing the specific failing test in the CI log.
3. **Given** all e2e tests pass, **When** CI runs, **Then** the e2e check is marked green.

---

### User Story 3 - Fast Feedback on Pushes (Priority: P3)

While iterating on a feature branch (before opening a PR), every push runs the fast unit test suites so the developer gets quick feedback without waiting for the slower e2e suite. The e2e suite is reserved for the PR stage.

**Why this priority**: E2E tests are slow (multiple browser contexts, 2/3/4-player scenarios) and run unattended as automated scripts. Gating every push on them would create unacceptable delays during active development; unit tests (~30 s) are the right gate for in-progress work.

**Independent Test**: Can be verified by pushing a commit to a feature branch and observing only the unit test checks run (no e2e), then opening a PR and observing e2e additionally run.

**Acceptance Scenarios**:

1. **Given** a commit is pushed to any branch, **When** the CI workflow triggers, **Then** the client and server unit test suites run.
2. **Given** a pull request targeting `main` is opened or updated, **When** the CI workflow triggers, **Then** the unit suites AND the Playwright e2e suite run, all reporting as status checks before merge.

---

### Edge Cases

- What happens when the server or client dev server fails to start before Playwright runs?
- How does CI handle a test suite that times out (e.g., Playwright waiting on a port indefinitely)?
- What if `npm install` fails due to a network issue or lockfile conflict?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CI MUST trigger automatically on push events and on pull requests targeting `main`.
- **FR-002**: CI MUST run the client Vitest unit test suite (`client/`) on both push and PR events.
- **FR-003**: CI MUST run the server Jest unit test suite (`server/`) on both push and PR events.
- **FR-004**: CI MUST run the Playwright e2e test suite ONLY on pull requests targeting `main` (not on plain push events). The e2e tests run as fully automated scripts requiring no human interaction.
- **FR-005**: Each test suite result MUST be reported as a distinct status check visible on GitHub PRs.
- **FR-006**: A failure in any suite MUST cause the overall workflow to fail, blocking PR merge when branch protection is enabled.
- **FR-007**: CI MUST install dependencies for `client/` and `server/` independently before running their respective suites.
- **FR-008**: The Playwright config MUST start the server (port 3000) and client (port 5173) via a `webServer` block and wait for both ports before running tests; this MUST also work for local `npx playwright test` runs.
- **FR-009**: The Playwright config MUST run headless without `slowMo` when a CI environment variable (e.g. `CI`) is set, while preserving headed + `slowMo` behavior for local runs.
- **FR-010**: CI MUST pin Node.js to version 22 (LTS) across all jobs.
- **FR-011**: CI MUST complete within a reasonable time so feedback is not excessively delayed.
- **FR-012**: Playwright test artifacts (trace files, screenshots on failure) MUST be uploaded as workflow artifacts for post-run inspection.

### Key Entities

- **CI Workflow**: A GitHub Actions YAML file that defines jobs, triggers, and steps for the pipeline.
- **Job**: An isolated unit of work (unit tests client, unit tests server, e2e tests) that runs in its own environment.
- **Status Check**: GitHub's per-job pass/fail signal surfaced on PRs and commits.
- **Workflow Artifact**: Files produced by CI (test reports, Playwright traces) stored for a retention period post-run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a PR, all three test suites (client unit, server unit, e2e) complete and report a pass/fail status check within 10 minutes of the workflow trigger. On a plain push, the two unit suites complete within 3 minutes.
- **SC-002**: A PR with any failing test cannot be merged (enforced by required status checks on the `main` branch).
- **SC-003**: On a fully green run, zero manual steps are required from the developer to confirm test results — results are visible directly on the PR page.
- **SC-004**: Playwright failure artifacts (screenshots, traces) are accessible from the workflow run for at least 7 days.
- **SC-005**: The workflow definition requires no repository secrets or external services beyond what GitHub Actions provides natively (no paid third-party CI service needed).

## Assumptions

- The repository is hosted on GitHub and GitHub Actions is available and enabled.
- `client/` runs Vitest via `npm test` (`vitest run`) and `server/` runs Jest via `npm test`.
- Playwright tests live in the top-level `e2e/` directory (config: [playwright.config.ts](../../playwright.config.ts)) and are runnable via `npx playwright test` from the repo root.
- The server listens on port 3000 (`process.env.PORT || '3000'`) and the client (Vite) on port 5173; the e2e helpers hardcode these in [e2e/helpers.ts](../../e2e/helpers.ts).
- Branch protection rules on `main` will be configured separately by the repository owner to enforce required status checks; this spec covers only the workflow definition.
- CI installs Playwright browsers via `npx playwright install --with-deps` (not assumed pre-cached on the runner).
- Node.js is pinned to 22 LTS in CI (no `engines` field currently exists; local dev uses a newer non-LTS version).
