# Phase 1 Data Model: GitHub Actions CI Pipeline

This feature has no application data model. The "entities" here are CI configuration constructs and their relationships.

## Entities

### Workflow

The top-level CI definition (`.github/workflows/ci.yml`).

| Field | Value |
|-------|-------|
| name | `CI` |
| triggers | `push`, `pull_request` |
| concurrency | group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` |
| jobs | `client-unit`, `server-unit`, `e2e` |

### Job: client-unit

| Field | Value |
|-------|-------|
| runs-on | `ubuntu-latest` |
| runs when | all events (push + PR) |
| node | 22 (setup-node@v4, cache npm) |
| steps | checkout → setup-node → `npm ci` (client) → `npm test` (client) |
| produces | status check "client-unit" |

### Job: server-unit

| Field | Value |
|-------|-------|
| runs-on | `ubuntu-latest` |
| runs when | all events (push + PR) |
| node | 22 |
| steps | checkout → setup-node → `npm ci` (server) → `npm test` (server) |
| produces | status check "server-unit" |

### Job: e2e

| Field | Value |
|-------|-------|
| runs-on | `ubuntu-latest` |
| runs when | `github.event_name == 'pull_request'` only |
| node | 22 |
| steps | checkout → setup-node → `npm ci` (root + client + server) → `npx playwright install --with-deps chromium` → `npx playwright test` → upload artifacts on failure |
| env | `CI=true` (set automatically by Actions) |
| produces | status check "e2e"; artifacts (HTML report, traces, `test-results/`), retention 7 days |

## Relationships

```text
push event ──────────────► client-unit ─┐
            └────────────► server-unit ─┤── all must pass
                                         │
pull_request event ──────► client-unit ─┤
                    ├─────► server-unit ─┤── all must pass (merge gate)
                    └─────► e2e ─────────┘   (PR-only)
```

- Jobs are independent (no `needs`); they run in parallel.
- e2e self-provisions its runtime via the Playwright `webServer` block (boots server:3000 + client:5173), so it needs no other job.
- Overall workflow conclusion = AND of all jobs that ran. Any failure fails the workflow (FR-006).

## Config object: playwright.config.ts (modified)

| Field | Before | After |
|-------|--------|-------|
| `use.headless` | `false` | `!!process.env.CI` |
| `use.launchOptions.slowMo` | `400` | `process.env.CI ? 0 : 400` |
| `use.trace` | (absent) | `'retain-on-failure'` |
| `reporter` | (absent → default `list`) | `[['list'], ['html', { open: 'never' }]]` |
| `webServer` | (absent) | `[server:3000, client:5173]` with `reuseExistingServer: !process.env.CI` |
| `workers` | `1` | `1` (unchanged — default for stability; games ARE isolated by unique random gameID so parallel runs are correctness-safe, but each test opens up to 4 browser contexts and a 2-core runner would get flaky/slow. Tunable later if needed.) |
| `timeout` | `300000` | `300000` (unchanged) |
