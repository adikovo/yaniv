# Phase 0 Research: Production Deployment & CD

All clarifications from the spec are resolved (Netlify client, Oracle VM server, DuckDNS + Let's Encrypt, automated SSH CD, locked CORS, $0). This document records the concrete technical decisions and rationale that the tasks will implement.

## 1. Server host — always-on, free VM

**Decision**: Oracle Cloud **Always Free** VM running **Ubuntu 22.04 LTS**. Prefer an **Ampere A1 (ARM)** shape (generous free allotment); fall back to an **AMD `VM.Standard.E2.1.Micro`** if ARM capacity is unavailable. Reserve/attach the public IP so it survives instance stop/start.

**Rationale**: Genuinely free *and* never sleeps — the only combination that satisfies SC-001 (no cold start) at $0. A real VM also gives full control of nginx/TLS and is a stronger CV signal than a one-click PaaS.

**Alternatives considered**:
- Render/Koyeb/Cloud Run free tiers — scale-to-zero → cold start, violates SC-001.
- Railway/Fly free — removed; would cost money.
- GCP `e2-micro` Always Free — viable backup, but smaller and US-region-only.

## 2. Process manager — survive crashes & reboots

**Decision**: **pm2**, with `pm2 start ... --name yaniv`, then `pm2 save` + `pm2 startup` (which installs a systemd unit) so the process relaunches on boot. Optional `ecosystem.config.js` in `server/` to pin the start command and env.

**Rationale**: Simplest Node-native option; gives auto-restart-on-crash (FR-005), boot persistence, and log access in one tool. `pm2 startup` ultimately uses systemd, so we get systemd durability without hand-writing a unit.

**Alternatives considered**: hand-written systemd unit (more native but more setup); bare `node` + `nohup` (no restart/boot guarantees — rejected).

## 3. Reverse proxy + websockets

**Decision**: **nginx** server block listening on 443, `proxy_pass` to `http://127.0.0.1:3000`, with the websocket upgrade headers required by Socket.io:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Rationale**: nginx is the standard, well-documented TLS terminator and websocket proxy; certbot has first-class nginx integration. The Node server keeps listening on plain `:3000` bound to localhost; nginx is the only public-facing port.

**Alternatives considered**: Caddy (auto-TLS, simpler config) — fewer examples for the user's first time and certbot/nginx is the most-documented path; expose Node directly with its own TLS — more app-level cert handling, rejected.

## 4. HTTPS hostname + certificate

**Decision**: Free **DuckDNS** subdomain (e.g. `yaniv-<suffix>.duckdns.org`) pointing at the VM's public IP, then **Let's Encrypt** via **certbot --nginx**, which also installs a renewal systemd timer. Run a small DuckDNS updater cron (every 5 min) as a safety net so the record follows the IP even if it changes.

**Rationale**: Browsers refuse secure connections to bare IPs, and an HTTPS client page is blocked from reaching an HTTP server (FR-004). DuckDNS provides the required name for $0; certbot automates issuance + renewal. The hostname is internal config only (never shown to visitors), so its prettiness is irrelevant.

**Alternatives considered**: Cloudflare proxy (needs a domain on a CF account; extra hop); purchased domain (~$10/yr, breaks $0); sslip.io/nip.io (work but no clean renewable cert flow). DuckDNS chosen per clarification.

## 5. Client host + auto-deploy

**Decision**: **Netlify** connected to the GitHub repo. Build config via `client/netlify.toml`: base directory `client`, build `npm run build`, publish `client/dist`, plus an SPA catch-all redirect `/* → /index.html (200)` so React Router deep links work. `VITE_SERVER_URL` set in Netlify's environment settings. Netlify's GitHub app auto-builds on every push to `main`; a failed build leaves the last good deploy live (FR-008). Rename the site to a tidy free subdomain for the CV URL.

**Rationale**: Lowest-friction path for a Vite SPA, native git-push auto-deploy, atomic deploys (failed build never replaces the live one), free tier ample for demo traffic.

**Alternatives considered**: Cloudflare Pages (equivalent; slightly more SPA-routing config), GitHub Pages (needs an Actions build + has SPA quirks). Netlify chosen per clarification.

## 6. Config injection — client server URL

**Decision**: Read `import.meta.env.VITE_SERVER_URL` in both `client/src/api/socket.js` and `client/src/api/api.js`, falling back to `http://localhost:3000` when unset. Document in `client/.env.example`.

**Rationale**: Vite inlines `VITE_`-prefixed vars at build time, so Netlify bakes the production server URL into the bundle while local `npm run dev` (no var set) keeps using localhost — satisfying FR-001 and FR-010/SC-007 (local dev unchanged).

## 7. CORS / origin lockdown

**Decision**: Introduce a server config value (e.g. `CLIENT_ORIGIN`, comma-separated) read in `server/config.js`, defaulting to the localhost dev origins when unset. Apply it to both the Express `cors()` middleware in `app.js` and the Socket.io `cors.origin` in `socket.js`, replacing `origin: "*"`. In production, set it to the Netlify origin.

**Rationale**: FR-014 — reject unknown origins in production while keeping local dev working via the default. One source of truth shared by HTTP and websocket layers.

**Alternatives considered**: keep `"*"` (simplest, weaker posture — rejected per clarification); hardcode the Netlify origin (breaks local dev / not configurable — rejected).

## 8. Server CD — automated SSH deploy

**Decision**: A GitHub Actions workflow `.github/workflows/deploy-server.yml` that runs **after the CI workflow succeeds on `main`** (via `workflow_run` keyed to the CI workflow's `completed`/`success` conclusion on the `main` branch), using **`appleboy/ssh-action`** to SSH into the VM and run `ops/deploy.sh`:

```bash
cd ~/yaniv && git pull --ff-only && cd server && npm ci --omit=dev && pm2 restart yaniv
```

Secrets stored in the repo: `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY` (a dedicated deploy keypair; public half in the VM's `authorized_keys`). The VM holds a `git clone` of the public repo.

**Rationale**: Completes server CD (US3) with the literal "3 commands" the user wanted. Gating on `workflow_run`+success guarantees a deploy never runs against a red `main` (FR-009). `appleboy/ssh-action` is the de-facto SSH-deploy action. A dedicated deploy key (not a personal key) limits blast radius; secrets live only in GitHub (FR-011).

**Alternatives considered**: trigger directly on `push: main` (simpler, but could in theory run before/independent of CI — `workflow_run` is safer); rsync/scp the build (server needs `npm ci` anyway, `git pull` is cleaner); self-hosted runner on the VM (overkill).

**Deploy resilience**: `git pull --ff-only` + `pm2 restart` means a failed `npm ci` leaves the old process running (pm2 only restarts on a successful script up to that point); we surface failures via the Actions run status (FR-009).

## 9. Uptime monitoring (deferred decision, low cost to add)

**Decision**: Optional — add a free **UptimeRobot** HTTP monitor on the DuckDNS URL post-launch. Not required for the feature to be complete; provides a public uptime signal (nice CV extra) and early warning if the VM ever drops.

**Rationale**: Spec deferred observability to planning; it's a 5-minute external setup with no code impact, so it's listed as an optional final task rather than a core requirement.

## Resolved unknowns

| Prior unknown | Resolution |
|---|---|
| Which always-on free host | Oracle Always Free Ubuntu VM (Ampere A1, AMD micro fallback) |
| Crash/reboot durability | pm2 + `pm2 startup`/`save` (systemd-backed) |
| Websocket through TLS | nginx 443 reverse proxy with upgrade headers |
| Cert + hostname | DuckDNS subdomain + certbot/Let's Encrypt auto-renew |
| Client host & SPA routing | Netlify + `netlify.toml` redirect; `VITE_SERVER_URL` env |
| Origin security | shared `CLIENT_ORIGIN` config, localhost default, Netlify origin in prod |
| Server CD trigger | `workflow_run` after CI success on main → `appleboy/ssh-action` → `ops/deploy.sh` |
| Secrets handling | dedicated deploy keypair; `DEPLOY_SSH_*` GitHub secrets only |
