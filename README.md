# Yaniv Card Game

A real-time multiplayer implementation of the Yaniv card game. Host a room,
share the code, and play a full round against friends in the browser.

**▶️ Play live: https://yaniv-app.netlify.app**

## Tech stack

- **Client** — React 19, React Router, Vite, Socket.io-client
- **Server** — Node.js, Express, Socket.io (authoritative game state, in-memory)
- **Tests** — Vitest (client), Jest (server), Playwright (e2e)
- **CI/CD** — GitHub Actions

## Architecture

```
Browser ──https──▶ Netlify (static React client)
   │
   └──wss──▶ yaniv-app.mooo.com ──▶ nginx (TLS, ws upgrade) ──▶ Node + Socket.io :3000
                                         on an Oracle Cloud Always-Free VM (pm2)
```

- The **client** is a static build served by **Netlify**.
- The **server** is always-on (long-lived websockets + in-memory game state) on a
  free **Oracle Cloud** VM, kept alive by **pm2** and fronted by **nginx**, which
  terminates HTTPS (Let's Encrypt) and proxies websocket traffic to Node.
- The browser learns the server URL at build time via `VITE_SERVER_URL`; the
  server locks CORS / Socket.io to the client origin via `CLIENT_ORIGIN`.

## Continuous deployment

Every merge to `main` (after CI passes) ships both halves automatically:

- **Client** → Netlify rebuilds and republishes on push to `main`.
- **Server** → a GitHub Actions workflow (`.github/workflows/deploy-server.yml`)
  SSHes into the VM and runs `ops/deploy.sh` (`git pull` + `npm ci` + `pm2 restart`).

## Local development

```bash
# Server (http://localhost:3000)
cd server && npm install && npm start

# Client (http://localhost:5173)
cd client && npm install && npm run dev
```

With no env vars set, the client falls back to `http://localhost:3000` and the
server allows the `http://localhost:5173` dev origin — so local dev needs no setup.

## Tests

```bash
cd client && npm test     # Vitest
cd server && npm test     # Jest
npx playwright test       # e2e (from repo root)
```
