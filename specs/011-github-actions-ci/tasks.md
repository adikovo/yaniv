---
description: "Task list for GitHub Actions CI pipeline"
---

# Tasks: GitHub Actions CI Pipeline

**Input**: Design documents from `/specs/011-github-actions-ci/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ci-workflow.md, quickstart.md

**Tests**: This feature is CI infrastructure. There are no automated unit tests for the workflow itself; validation is done by running the suites locally (with and without `CI=true`) and by observing the status checks on a real PR (see quickstart.md). Verification tasks are included in each phase.

**Organization**: Tasks are grouped by the three user stories from spec.md. Only two files are created/modified:
- `.github/workflows/ci.yml` (new)
- `playwright.config.ts` (modified)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different file, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (maps to spec.md user stories)
- File paths are repo-root relative

## Path Conventions

- Workflow file: `.github/workflows/ci.yml`
- Playwright config: `playwright.config.ts` (repo root)
- Client suite: `client/` (`npm test` → `vitest run`)
- Server suite: `server/` (`npm test` → `jest`)
- E2E suite: `e2e/` (run from repo root via `npx playwright test`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the workflow file skeleton that all jobs attach to.

- [x] T001 Create `.github/workflows/ci.yml` with `name: CI`, triggers `on: [push, pull_request]`, and a `concurrency` block (group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`). No jobs yet — just the scaffold.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None beyond the Phase 1 scaffold. The Playwright config changes are required only by the e2e story (US2) and are therefore in that phase, not here. No task blocks all three stories.

**Checkpoint**: Workflow scaffold exists; user story phases can begin.

---

## Phase 3: User Story 1 - Unit tests run on push + PR (Priority: P1) 🎯 MVP

**Goal**: On every push and every PR, the client Vitest suite and server Jest suite run as two distinct status checks.

**Independent Test**: Push a commit (or open a PR) and observe `client-unit` and `server-unit` checks appear and reflect real pass/fail.

### Implementation for User Story 1

- [x] T002 [US1] Add the `client-unit` job to `.github/workflows/ci.yml`: `runs-on: ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` (node-version 22, `cache: npm`, cache path `client/package-lock.json`), `npm ci` in `client/`, then `npm test`.
- [x] T003 [US1] Add the `server-unit` job to `.github/workflows/ci.yml`: same runner/node setup pattern as T002 but for `server/` (`npm ci` + `npm test`). Independent job (no `needs`).
- [x] T004 [US1] Verify the CI commands locally: `cd client && npm ci && npm test` and `cd server && npm ci && npm test` both pass, confirming the exact commands CI will run.

**Checkpoint**: Pushing/opening a PR produces two green unit checks. This is the MVP.

---

## Phase 4: User Story 2 - E2E tests run on PR (Priority: P2)

**Goal**: On PRs targeting `main`, the Playwright suite runs unattended (headless, self-starting server+client) as a third status check, with failure artifacts uploaded.

**Independent Test**: Open a PR and observe the `e2e` check run headless and report pass/fail; force a failure and confirm artifacts are downloadable.

### Playwright config changes (prerequisite for the e2e job)

> These three tasks edit the same file (`playwright.config.ts`) and must be done in order. They can run in parallel with the US1 ci.yml tasks (different file) — hence [P].

- [x] T005 [P] [US2] In `playwright.config.ts`, make headless/slowMo CI-conditional: `use.headless = !!process.env.CI`, `use.launchOptions.slowMo = process.env.CI ? 0 : 400`.
- [x] T006 [US2] In `playwright.config.ts`, add a `webServer` array with two entries — server (`command: 'npm start'`, `cwd: 'server'`, `url: 'http://localhost:3000'`) and client (`command: 'npm run dev'`, `cwd: 'client'`, `url: 'http://localhost:5173'`) — each with `reuseExistingServer: !process.env.CI` and a startup `timeout`.
- [x] T007 [US2] In `playwright.config.ts`, add `reporter: [['list'], ['html', { open: 'never' }]]` and `use.trace: 'retain-on-failure'` so artifacts exist on failure.
- [x] T008 [US2] Verify locally: `CI=true npx playwright test` runs headless, auto-starts server+client, and passes; plain `npx playwright test` still runs headed with slowMo. (Closes the local-equivalence contract.)

### E2E job

- [x] T009 [US2] Add the `e2e` job to `.github/workflows/ci.yml`: guard `if: github.event_name == 'pull_request'`, `runs-on: ubuntu-latest`, checkout + setup-node 22, `npm ci` at root **and** in `client/` and `server/` (webServer needs their deps), `npx playwright install --with-deps chromium`, then `npx playwright test`.
- [x] T010 [US2] Add an artifact upload step to the `e2e` job: `actions/upload-artifact@v4` with `if: ${{ failure() }}`, uploading `playwright-report/` and `test-results/`, `retention-days: 7`.

**Checkpoint**: PRs run all three checks; e2e failures surface downloadable traces/report.

---

## Phase 5: User Story 3 - Trigger split / fast feedback (Priority: P3)

**Goal**: Plain pushes run unit suites only (no e2e); PRs run all three. Confirms the cost/speed split.

**Independent Test**: Push to a branch without a PR → only `client-unit` + `server-unit` run. Open a PR → `e2e` additionally runs.

### Implementation for User Story 3

- [x] T011 [US3] Confirm the `e2e` job's `if: github.event_name == 'pull_request'` guard (from T009) correctly excludes plain push events while the unit jobs remain ungated, by reviewing `.github/workflows/ci.yml`.
- [x] T012 [US3] Cross-check the realized trigger matrix against `specs/011-github-actions-ci/contracts/ci-workflow.md` (push → 2 unit checks; PR → 3 checks). Fix the workflow if they diverge.

**Checkpoint**: Trigger behavior matches the contract.

---

## Phase 6: Polish & Validation

**Purpose**: End-to-end verification on real GitHub and docs.

- [x] T013 Run the full `specs/011-github-actions-ci/quickstart.md` validation: local `CI=true` run, push branch + open PR, confirm three checks go green within budget, force an e2e failure to confirm artifacts, then revert. (Artifact-on-failure confirmed by real CI run 27539726743, which uploaded a downloadable `playwright-traces` artifact; the failing test was then fixed by the e2e determinism work.)
- [x] T014 [P] (Manual, repo owner) Enable branch protection on `main` requiring the `client-unit`, `server-unit`, and `e2e` status checks (per quickstart.md step 5). Out of code scope; documented here for completeness. (Done via ruleset `main-ci-required` after making the repo public — requires all three checks + a PR, 0 approvals, blocks force-push/deletion.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. Blocks all job tasks (they attach to this file).
- **Foundational (Phase 2)**: Empty.
- **US1 (Phase 3)**: Depends on T001. Independent of US2/US3.
- **US2 (Phase 4)**: Depends on T001. Config tasks (T005–T008) are independent of US1 and can run in parallel; the e2e job (T009) depends on the config tasks being done.
- **US3 (Phase 5)**: Depends on T009 (the guard it verifies).
- **Polish (Phase 6)**: Depends on all jobs being in place (T002, T003, T009, T010).

### Within Each Story

- US1: T002 and T003 edit the same file (ci.yml) → sequential. T004 verifies after.
- US2: T005 → T006 → T007 (same file, ordered) → T008 verify → T009 → T010.
- US3: T011 → T012 (review/verify only).

### Parallel Opportunities

- The Playwright config tasks (T005–T007, in `playwright.config.ts`) can proceed in parallel with the US1 unit-job tasks (T002–T003, in `ci.yml`) since they touch different files.
- T013 and T014 are independent of each other.

---

## Parallel Example

```text
# After T001 (scaffold) exists, two independent tracks can run at once:

Track A (ci.yml — unit jobs):
  T002 Add client-unit job
  T003 Add server-unit job

Track B (playwright.config.ts — e2e prerequisites):
  T005 CI-conditional headless/slowMo
  T006 webServer block
  T007 reporter + trace
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 (scaffold) → T002, T003, T004 (unit jobs).
2. **STOP and VALIDATE**: push and confirm two green unit checks. This alone is a useful CI.

### Incremental Delivery

1. Setup + US1 → unit CI live (MVP).
2. US2 → e2e on PRs with artifacts.
3. US3 → confirm the push-vs-PR split.
4. Polish → real-PR validation + branch protection.

---

## Notes

- Only `.github/workflows/ci.yml` (new) and `playwright.config.ts` (modified) change. No application source is touched.
- `CI=true` is set automatically by GitHub Actions — no manual env config needed; the config keys off it.
- `workers: 1` is intentionally kept (stability on a 2-core runner); tunable later.
- Commit suggestion: one commit for the Playwright config change, one for the workflow file.
- Separate from this feature: the uncommitted gameID-uniqueness change on this branch is unrelated to CI and should be committed on its own.
