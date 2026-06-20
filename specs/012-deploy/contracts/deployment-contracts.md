# Deployment Contracts

The precise, testable interfaces this feature introduces. These are the "source of truth" the implementation must match; the quickstart shows *where* to set them.

## 1. Client build-time config

**`VITE_SERVER_URL`** — absolute base URL of the server, no trailing slash.

- Consumed by `client/src/api/socket.js` and `client/src/api/api.js`.
- Contract: `const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"`.
- Production value (Netlify): `https://<duckdns-host>` (MUST be `https://` — an HTTPS page cannot call an HTTP/WS origin).
- Unset (local dev): falls back to `http://localhost:3000`. Local `npm run dev` MUST behave exactly as before.

## 2. Server runtime config

**`CLIENT_ORIGIN`** — comma-separated list of allowed browser origins.

- Read in `server/config.js`; applied to Express `cors()` (`app.js`) and Socket.io `cors.origin` (`socket.js`).
- Contract: production rejects any origin not in the list (no `*`). Default when unset: local dev origins (`http://localhost:5173,http://localhost:3000`).
- Production value: the Netlify origin, e.g. `https://yaniv-card-game.netlify.app` (no trailing slash).

**`PORT`** — server listen port. Already read by `server/bin/www` (default `3000`). nginx proxies to `127.0.0.1:$PORT`.

## 3. Public network contract (nginx on the VM)

> Plain-language: nginx is a "front desk" that faces the internet, adds HTTPS (the padlock), and forwards every request to your Node server running locally on port 3000. Visitors only ever touch nginx; Node stays private.

- **:80** → redirect to **:443**. (Port 80 = plain `http`, port 443 = secure `https`. This bounces insecure visitors to the secure address. certbot writes this rule automatically.)
- **:443** → terminate TLS (decrypt HTTPS using the Let's Encrypt cert) → `proxy_pass http://127.0.0.1:3000` (hand the now-plain request to the local Node server) **with websocket upgrade headers**:
  - `proxy_http_version 1.1`
  - `proxy_set_header Upgrade $http_upgrade`
  - `proxy_set_header Connection "upgrade"`
  - `proxy_set_header Host $host`
  - *(These four are what let Socket.io's persistent live connection pass through nginx. Omitting them = page loads but real-time gameplay silently breaks — the #1 Socket.io-behind-nginx mistake.)*
- The Node process binds `127.0.0.1:3000` only; nginx is the sole public listener (nobody can bypass HTTPS by hitting Node's raw port).
- **Contract test**: a secure websocket (`wss://<host>/socket.io/`) completes a Socket.io handshake from the Netlify origin; a request from a disallowed origin is rejected.

## 4. Client deploy trigger (Netlify)

- Source: GitHub repo, branch `main`.
- Build: base dir `client`, command `npm run build`, publish `client/dist` (defined in `client/netlify.toml`).
- SPA redirect: `/*` → `/index.html` status `200`. (So refreshing on a deep link like `/game/ABC` serves the app instead of a 404.)
- Behavior: every push to `main` triggers an atomic build+publish. A failed build MUST NOT replace the currently live deploy (FR-008).

## 5. Server deploy trigger (GitHub Actions)

- Workflow: `.github/workflows/deploy-server.yml`.
- Trigger: `workflow_run` on the CI workflow, filtered to `conclusion == success` and `head_branch == main` (a deploy MUST NOT run against a red `main`).
- Action: `appleboy/ssh-action` → runs `ops/deploy.sh` on the VM:
  ```bash
  cd ~/yaniv && git pull --ff-only && cd server && npm ci --omit=dev && pm2 restart yaniv
  ```
- Secrets (GitHub repo, never committed): `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY`.
- Failure contract: a failed step leaves the previous pm2 process running; failure is visible as a red Actions run (FR-009).

## 6. Durability contract (VM)

- pm2 process named `yaniv`; `pm2 save` + `pm2 startup` ⇒ relaunch on crash and on reboot (FR-005, SC-005).
- certbot systemd timer auto-renews the TLS cert.
- DuckDNS updater cron keeps the hostname pointed at the VM IP.
