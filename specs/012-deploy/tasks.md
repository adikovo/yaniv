---

description: "Task list for Production Deployment & Continuous Deployment"
---

# Tasks: Production Deployment & Continuous Deployment

**Input**: Design documents from `/specs/012-deploy/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/deployment-contracts.md, quickstart.md

**Tests**: Included for the two app-code changes (env-driven URL, CORS lock-down) per the project's TDD workflow. Host/infra tasks are verified operationally via quickstart.md, not unit tests.

## Owner legend

Each task is tagged with **who performs it**:

- **[REPO]** = a code/config change in the repository — Claude does this.
- **[MANUAL]** = account/host/browser/SSH action — **you** do this (Claude guides via quickstart.md; it cannot access your accounts or VM).

Tasks are ordered by real dependency, so [REPO] and [MANUAL] interleave where one needs the other (e.g. the server's real `CLIENT_ORIGIN` can't be set until the Netlify URL exists).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Polish carry no story label)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Document the new config surface and protect secrets.

- [X] T001 [P] [REPO] Create `client/.env.example` documenting `VITE_SERVER_URL` (with note: unset → falls back to `http://localhost:3000`)
- [X] T002 [P] [REPO] Create `server/.env.example` documenting `CLIENT_ORIGIN` (comma-separated origins) and `PORT`
- [X] T003 [REPO] Add `.env` (and `.env.*`, keeping `.env.example`) to gitignore for `client/` and `server/` so real config/secrets are never committed (FR-011)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two env-driven code changes both the client and server deploys depend on. Fully testable locally with no accounts (fallbacks preserve current dev behavior — FR-010 / SC-007).

**⚠️ CRITICAL**: No deploy work (US1–US3) should begin until this phase is complete and green.

### Tests (write first, ensure they FAIL)

- [X] T004 [P] [REPO] Failing Vitest: server URL resolves from `VITE_SERVER_URL` and falls back to `http://localhost:3000` when unset — `client/src/api/serverUrl.test.js` (colocated, per repo convention)
- [X] T005 [P] [REPO] Failing Jest: allowed origins parse from `CLIENT_ORIGIN` and default to localhost dev origin; an origin not in the list is rejected — `server/tests/cors.test.js`

### Implementation

- [X] T006 [P] [REPO] Add shared `client/src/api/serverUrl.js` (`SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"`) and use it in `client/src/api/socket.js`
- [X] T007 [P] [REPO] Use the same shared `SERVER_URL` module in `client/src/api/api.js`
- [X] T008 [REPO] Add `getAllowedOrigins` (comma-split, default `http://localhost:5173`) + shared `corsOrigin` callback exported from `server/config.js`
- [X] T009 [REPO] Apply `corsOrigin` to the Express `cors()` middleware in `server/app.js` (replace blanket usage)
- [X] T010 [REPO] Apply `corsOrigin` to the Socket.io `cors.origin` in `server/socket.js` (replace `origin: "*"`)
- [X] T011 [REPO] Ran client (Vitest 67✓) + server (Jest 70✓) + e2e (Playwright 9✓) — new tests green, no regressions

**Checkpoint**: App works locally exactly as before; production config is now injectable.

---

## Phase 3: User Story 1 - Visitor opens the public link and plays immediately (Priority: P1) 🎯 MVP

**Goal**: A public, always-on HTTPS URL where a cold first-time visitor can host and play with no wake-up delay.

**Independent Test**: From a fresh machine after overnight idle, open the Netlify URL → host a game within seconds; a second visitor joins and a round plays end-to-end over `wss://` with no errors.

### Repo configs (prepare before host setup)

- [X] T012 [P] [US1] [REPO] Create `netlify.toml` (repo root, not client/ — Netlify reads config from root): base `client`, build `npm run build`, publish `dist`, SPA redirect `/* → /index.html (200)`
- [X] T013 [P] [US1] [REPO] Create `ops/nginx-yaniv.conf` reference: `proxy_pass http://127.0.0.1:3000` with websocket upgrade headers (per contracts §3), `server_name` placeholder for the DuckDNS host (certbot adds the 443 block)

### Host setup (you, guided by quickstart.md)

- [X] T014 [US1] [MANUAL] Provision the Oracle Always Free Ubuntu VM, reserve its public IP, open TCP 80/443 (subnet security list + host firewall) — quickstart Part 1
- [X] T015 [US1] [MANUAL] On the VM: install Node + git, `git clone` the repo, `npm ci --omit=dev` in `server/`, start under pm2, run `pm2 save` + `pm2 startup` for crash/reboot durability — quickstart Part 2
- [X] T016 [US1] [MANUAL] Create a DuckDNS subdomain pointed at the VM IP, add the updater cron — quickstart Part 3 (used FreeDNS `yaniv-app.mooo.com` — DuckDNS was down; static Oracle IP so no updater cron needed)
- [X] T017 [US1] [MANUAL] Install nginx using `ops/nginx-yaniv.conf`, then `certbot --nginx` to issue the Let's Encrypt cert + 80→443 redirect + renewal timer; confirm `https://<host>` reaches the server — quickstart Part 4 (also had to open Oracle security list + insert iptables ACCEPT for 80/443 above the default REJECT)
- [X] T018 [US1] [MANUAL] Create the Netlify site from the GitHub repo, set `VITE_SERVER_URL=https://yaniv-app.mooo.com`, deploy, and rename the site to the tidy CV subdomain `https://yaniv-app.netlify.app` — quickstart Part 6
- [X] T019 [US1] [MANUAL] Set `CLIENT_ORIGIN=https://yaniv-app.netlify.app` on the VM and `pm2 restart yaniv --update-env` + `pm2 save` — quickstart Part 5
- [X] T020 [US1] Verify acceptance (SC-001/002/003): cold load hosts a game within 5s; two browsers play a full round over `wss://` with no console CORS/security errors; two games run concurrently without interference (verified live at https://yaniv-app.netlify.app; pinned client to websocket transport to remove initial-polling lag)

**Checkpoint**: The public link is live, always-on, and playable — MVP delivered.

---

## Phase 4: User Story 2 - Client ships automatically on every merge to main (Priority: P2)

**Goal**: Every push to `main` rebuilds and republishes the client with no manual step.

**Independent Test**: Merge a visible client change to `main`; it appears on the live URL within minutes with no manual action.

- [X] T021 [US2] [MANUAL] Confirm Netlify's GitHub integration is set to auto-build on push to `main`; merge a small visible client change and verify it goes live within ~5 minutes (SC-004), and that a deliberately broken build leaves the previous deploy serving (FR-008) — quickstart Part 6 (verified: merge of PR #14 auto-published `main@4c34a80`, "Auto publishing is on")

**Checkpoint**: Client half of CD is automatic.

---

## Phase 5: User Story 3 - Server ships automatically on merge to main (Priority: P3)

**Goal**: A merge to `main` (after CI passes) auto-deploys the server over SSH — no manual login.

**Independent Test**: Merge a server change to `main`; after CI goes green the deploy workflow runs and the live server serves the new code.

### Repo configs

- [X] T022 [P] [US3] [REPO] Create `ops/deploy.sh`: `cd ~/yaniv && git pull --ff-only && cd server && npm ci --omit=dev && pm2 restart yaniv` (no `--update-env`, to preserve the saved `CLIENT_ORIGIN`)
- [X] T023 [US3] [REPO] Create `.github/workflows/deploy-server.yml`: `workflow_run` on the `CI` workflow (`.github/workflows/ci.yml`) filtered to `conclusion == success` and `head_branch == main`, using `appleboy/ssh-action` with secrets `DEPLOY_SSH_HOST` / `DEPLOY_SSH_USER` / `DEPLOY_SSH_KEY` to run `ops/deploy.sh`

### Secrets & key (you, guided by quickstart.md)

- [X] T024 [US3] [MANUAL] On the VM, generate a dedicated deploy keypair (`~/deploy_key`) and append its public half to `~/.ssh/authorized_keys` — quickstart Part 7 step 1
- [X] T025 [US3] [MANUAL] Add GitHub Actions secrets `DEPLOY_SSH_HOST` (129.159.157.174), `DEPLOY_SSH_USER` (ubuntu), `DEPLOY_SSH_KEY` (the private key) — quickstart Part 7 step 2
- [ ] T026 [US3] Verify (FR-009): merge a server change to `main` → CI passes → `deploy-server.yml` runs green → live server runs new code; a deliberately failing deploy leaves the previous pm2 process running and shows red in Actions

**Checkpoint**: Both halves of CD are fully automatic.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 [P] [REPO] Update `README.md` with the live public URL, a short architecture note (Netlify client + Oracle VM server + nginx/TLS), and optional CI/uptime badges
- [ ] T028 [REPO] Run full local test suites + `npm run lint` (client) to confirm the env/CORS changes introduced no regressions
- [ ] T029 [US1] [MANUAL] Reboot the VM and confirm auto-recovery: pm2 resurrects `yaniv` and nginx serves with no manual action (SC-005)
- [ ] T030 [P] [MANUAL] (Optional) Add a free UptimeRobot HTTP monitor on the DuckDNS URL for an uptime badge + early warning
- [ ] T031 [MANUAL] Run the quickstart.md Part 8 acceptance checklist end-to-end as the final sign-off

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → no dependencies; start immediately.
- **Foundational (Phase 2)** → after Setup; **blocks all user stories** (deploys rely on env-driven URL + CORS).
- **US1 (Phase 3)** → after Foundational. Delivers the MVP. T012–T013 (repo) can be done up front; T014→T019 are strictly ordered (VM → run → DNS → TLS → Netlify → origin lock); T020 verifies.
- **US2 (Phase 4)** → after US1 (Netlify site must exist before auto-deploy can be confirmed).
- **US3 (Phase 5)** → after US1 (needs the running VM + repo clone). T022–T023 (repo) can be written anytime after Foundational; T024–T025 need the VM (T015); T026 verifies.
- **Polish (Phase 6)** → after the stories it touches.

### Key cross-owner ordering

- T019 (set real `CLIENT_ORIGIN`) depends on T018 (Netlify URL exists).
- T018 (`VITE_SERVER_URL`) depends on T017 (HTTPS host exists).
- T023 (deploy workflow) is repo-side but only *functions* once T024–T025 (key + secrets) and T015 (VM clone) exist.

### Parallel opportunities

- T001 / T002 in parallel; T004 / T005 in parallel; T006 / T007 in parallel.
- T012 / T013 in parallel; T022 can be written alongside T023's drafting.

---

## Implementation Strategy

### MVP first (US1)

1. Phase 1 Setup → Phase 2 Foundational (all [REPO], commit + verify locally).
2. Phase 3 US1: commit T012–T013, then walk through the manual host setup together (T014–T019), verify T020.
3. **STOP & VALIDATE**: the public link is live and playable. This alone satisfies the CV goal.

### Incremental delivery

4. US2 (T021): confirm client auto-deploy — small, mostly verification.
5. US3 (T022–T026): add automated server deploy.
6. Polish: README, reboot test, optional uptime monitor, final quickstart sign-off.

### Suggested commit grouping (you run git)

- Commit A: T001–T003 (config docs + gitignore)
- Commit B: T004–T011 (env URL + CORS, with tests)
- Commit C: T012–T013 (netlify.toml + nginx reference)
- Commit D: T022–T023 (deploy.sh + deploy workflow)
- Commit E: T027 (README)

Manual tasks (T014–T019, T024–T025, T029–T031) produce no repo changes — nothing to commit; their "artifacts" live on Oracle/Netlify/GitHub settings.

---

## Notes

- [REPO] tasks are Claude's; [MANUAL] tasks need your accounts/VM/browser and are guided by [quickstart.md](./quickstart.md).
- Locking CORS keeps localhost origins by default, so local dev and the existing Playwright e2e suite stay green.
- No game-state persistence: deploys/reboots drop in-flight games by design — time server deploys for quiet periods.
