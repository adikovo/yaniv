# Implementation Plan: Production Deployment & Continuous Deployment

**Branch**: `012-deploy` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-deploy/spec.md`

## Summary

Deploy the Yaniv app as a reliable, always-on, $0 public demo for a CV:

- **Client** → built by Vite and hosted on **Netlify** (free `*.netlify.app` subdomain), auto-deploying on every push to `main`. The server address is injected at build time via `VITE_SERVER_URL`.
- **Server** → an **Oracle Cloud Always Free** Ubuntu VM, run under **pm2** (auto-restart on crash + boot), fronted by **nginx** as a reverse proxy that upgrades websockets and terminates **HTTPS** via a **Let's Encrypt** certificate issued for a free **DuckDNS** subdomain. CORS / Socket.io origin is locked to the Netlify origin + localhost.
- **CD** → client auto-deploys via Netlify's GitHub integration; server auto-deploys via a **GitHub Actions** job that SSHes into the VM and runs `git pull → npm ci → pm2 restart`, using an SSH key stored as a repo secret.

The only application code changes are small and additive: make the client's server URL env-driven (with localhost fallback), and make the server's allowed origin env-driven. Everything else is configuration and one-time host setup, captured as a runbook in `quickstart.md`.

## Technical Context

**Language/Version**: Node.js (server, CommonJS) ; React 19 + Vite (client, ESM)

**Primary Dependencies**: Express 4, Socket.io 4 (server) ; socket.io-client 4, axios, react-router 7 (client). Infra: nginx, pm2, certbot/Let's Encrypt, DuckDNS, Netlify, GitHub Actions (`appleboy/ssh-action`)

**Storage**: N/A — game state is in-memory per room; no persistence (intentional)

**Testing**: Existing Vitest (client unit), Jest (server unit), Playwright (e2e) remain the CI gate. This feature is primarily operational; verification is a documented manual smoke (quickstart) plus a guard that the client build reads `VITE_SERVER_URL`

**Target Platform**: Server on Ubuntu 22.04 LTS (Oracle Always Free VM) ; client on Netlify CDN ; consumed by modern browsers

**Project Type**: Web application (existing `client/` + `server/`) plus deployment/infra configuration

**Performance Goals**: First-time visitor can host a game within 5s with no cold start (SC-001); always-on

**Constraints**: $0 recurring cost ; single server process (in-memory state) ; secure context end-to-end (HTTPS page → WSS server) ; no secrets committed ; local dev unchanged when no deploy config present

**Scale/Scope**: Low portfolio/demo traffic; many concurrent independent games on one process; tens of simultaneous players

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unratified template with no concrete principles, so there are **no formal gates** to evaluate. PASS by default.

Informal alignment with established project conventions (from prior features):

- **CI gate preserved**: client/server auto-deploy only follows the existing required checks on `main`.
- **Small, focused commits**: changes split into env-config, CORS, client deploy config, server CD workflow, and docs.
- **Local dev untouched**: all new behavior is gated behind env vars that are absent locally.

No violations → Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/012-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 — host/proxy/TLS/CD decisions + rationale
├── data-model.md        # Phase 1 — configuration & secrets "entities"
├── quickstart.md        # Phase 1 — the one-time setup runbook + verification
├── contracts/
│   └── deployment-contracts.md   # env-var, origin, routing, and CD-trigger contracts
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
client/
├── src/api/
│   ├── socket.js        # MODIFY: io(VITE_SERVER_URL || "http://localhost:3000")
│   └── api.js           # MODIFY: SERVER_URL = VITE_SERVER_URL || "http://localhost:3000"
├── .env.example         # NEW: documents VITE_SERVER_URL
└── netlify.toml         # NEW: base/build/publish + SPA redirect

server/
├── app.js               # MODIFY: cors() uses allowed-origins env
├── socket.js            # MODIFY: Socket.io cors.origin uses allowed-origins env
├── config.js            # MODIFY: read CLIENT_ORIGIN(S) with localhost default
├── .env.example         # NEW: documents CLIENT_ORIGIN / PORT
└── ecosystem.config.js  # NEW (optional): pm2 process definition

.github/workflows/
└── deploy-server.yml    # NEW: SSH deploy to VM after CI success on main

ops/                     # NEW: reference configs applied on the VM (not executed by repo)
├── nginx-yaniv.conf     # sample reverse-proxy + websocket + TLS server block
└── deploy.sh            # the pull→install→restart script run on the VM
```

**Structure Decision**: Reuse the existing `client/` + `server/` web-app layout; this feature only *adds* configuration (`.env.example`, `netlify.toml`, `ecosystem.config.js`), one CD workflow under `.github/workflows/`, and a non-executing `ops/` reference folder for the VM-side configs. App logic changes are limited to two env-driven values (client server URL, server allowed origin).

## Complexity Tracking

> No constitution violations — section intentionally empty.
