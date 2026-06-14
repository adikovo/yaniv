# Contract: CI Workflow

The "interface" this feature exposes is the set of status checks GitHub surfaces on commits and PRs, plus the local-equivalence guarantee of the Playwright config.

## Trigger → Check contract

| Event | client-unit | server-unit | e2e |
|-------|:-----------:|:-----------:|:---:|
| Push to any branch | ✅ runs | ✅ runs | ⛔ skipped |
| Pull request → `main` | ✅ runs | ✅ runs | ✅ runs |

A check is **green** iff its test command exits 0. A check is **red** iff the command exits non-zero. The workflow conclusion is **success** iff every job that ran succeeded.

## Status check names (stable identifiers)

These names must remain stable so branch protection's "required checks" keep matching:

- `client-unit`
- `server-unit`
- `e2e`

(If job `name:` fields change, required-check config on `main` must be updated.)

## Command contract (what each job runs)

| Job | Working dir | Command |
|-----|-------------|---------|
| client-unit | `client/` | `npm ci` then `npm test` (→ `vitest run`) |
| server-unit | `server/` | `npm ci` then `npm test` (→ `jest`) |
| e2e | repo root | `npm ci` (+ client/server installs), `npx playwright install --with-deps chromium`, `npx playwright test` |

## Local-equivalence contract (Playwright config)

`npx playwright test` from the repo root MUST behave identically in both environments, differing only by `CI`:

| Aspect | Local (`CI` unset) | CI (`CI=true`) |
|--------|--------------------|----------------|
| Browser display | headed | headless |
| slowMo | 400ms | 0 |
| Server/client startup | reuse if already running | always start fresh, tear down after |
| Trace | retained on failure | retained on failure |

## Artifact contract

On e2e failure, the run MUST expose downloadable artifacts:
- `test-results/` (per-test `trace.zip` + error context, screenshots)
- Retention: ≥ 7 days

Reporter is `list` only (console output in the GitHub log); the HTML report
was intentionally dropped to avoid a ~40 MB bundle per failed run. The
retained trace (`trace.zip`, opened with `npx playwright show-trace`) is the
debugging artifact.

## Non-goals (explicit)

- Configuring branch-protection required checks (done manually by repo owner).
- Deployment / publishing steps.
- Linting as a gate (existing `npm run lint` is not wired into CI by this feature).
- Caching Playwright browsers (install fresh each e2e run).
