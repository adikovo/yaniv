# Feature Specification: Production Deployment & Continuous Deployment

**Feature Branch**: `012-deploy`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Continuous deployment for the Yaniv card game. Deploy the two parts of the app to production with a CV-shareable public URL. The static client is hosted on a free static host that auto-deploys on every push to main. The always-on websocket server is deployed to a self-managed free always-on VM behind a reverse proxy with HTTPS. Prerequisite: the client's hardcoded server URL becomes environment-driven with a localhost fallback for local dev."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor opens the public link and plays immediately (Priority: P1)

A recruiter or team lead clicks the URL on the author's CV. The page loads quickly, they can host or join a game, and the real-time gameplay (dealing, turns, callouts) works end-to-end — with no multi-second "waking up" delay, even if nobody has used the app for hours.

**Why this priority**: This is the entire point of the feature. The deployment exists to be a reliable, professional, always-available demonstration. If the first impression is a 60-second hang, the link has failed at its job.

**Independent Test**: From a machine that has never visited the site, after the deployment has been idle overnight, open the public URL and confirm a game can be created and played to a turn within seconds — no cold-start stall.

**Acceptance Scenarios**:

1. **Given** the deployment has been idle for several hours, **When** a first-time visitor opens the public URL, **Then** the app loads and a game can be hosted within a few seconds, with no cold-start delay.
2. **Given** two visitors open the public URL, **When** one hosts and the other joins with the game code, **Then** real-time gameplay works (cards deal, turns advance, callouts appear) over the live connection.
3. **Given** several pairs of visitors are present, **When** each pair starts its own game, **Then** the games run concurrently and independently without interfering with one another.
4. **Given** the visitor's browser uses a secure (HTTPS) page, **When** the client opens its real-time connection to the server, **Then** the connection succeeds over a secure channel with no mixed-content or certificate errors.

---

### User Story 2 - Client ships automatically on every merge to main (Priority: P2)

When the author merges a change to `main` (after CI passes), the public client updates on its own — no manual build-and-upload step.

**Why this priority**: This is the "continuous" half of CD and the natural extension of the existing CI gate. It removes a manual, error-prone step, but the deployment is already valuable (US1) even if this step were manual.

**Independent Test**: Make a visible client change, merge to `main`, and confirm the live public site reflects it within a few minutes without any manual deploy action.

**Acceptance Scenarios**:

1. **Given** a change is merged to `main` and CI is green, **When** the merge completes, **Then** the live client is rebuilt and updated automatically within a few minutes.
2. **Given** a build of the client fails, **When** the deploy runs, **Then** the previously working client remains live (a failed build does not take the site down).

---

### User Story 3 - Server changes ship via a repeatable, documented step (Priority: P3)

When the author changes the server, they can update the running production server through a single repeatable procedure, rather than improvising each time.

**Why this priority**: The server changes less often than the client and lives on a self-managed host, so a documented one-step procedure (initially manual) is sufficient. Full automation is a nice-to-have layered on later.

**Independent Test**: Make a server change, follow the documented deploy step, and confirm the live server runs the new code and automatically resumes after a host reboot.

**Acceptance Scenarios**:

1. **Given** a server code change, **When** the author runs the documented deploy step, **Then** the production server restarts on the new code and resumes serving connections.
2. **Given** the host machine reboots, **When** it comes back online, **Then** the server process starts automatically without manual intervention.

---

### Edge Cases

- **Mid-game deploy**: If the server is restarted to deploy new code while games are in progress, in-memory state for all active games is lost (no persistence). Affected players are disconnected and must start new games. This is accepted; deploys should be timed for quiet periods.
- **Local development unaffected**: A developer running the app locally with no deployment configuration set must still connect to the local server exactly as before.
- **Secure-context mismatch**: A secure client page must not be configured to reach an insecure server endpoint (browsers block it).
- **Idle reclamation**: The always-on host must not silently pause/reclaim the server for being "idle."
- **First request after a server deploy/reboot**: There is one short restart window; it should not appear as a permanent failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The client MUST read the server's base URL from build-time configuration rather than a hardcoded value, and MUST fall back to the local development server URL when no configuration is provided.
- **FR-002**: The deployed client MUST be served as static assets from a publicly reachable host over HTTPS.
- **FR-003**: The deployed server MUST remain continuously running ("always-on") with no idle-triggered sleep or cold-start delay for visitors.
- **FR-004**: The server MUST be reachable from the client over a secure real-time channel, with the public endpoint terminating HTTPS/secure-websocket traffic.
- **FR-005**: The server process MUST automatically restart after a crash and after a host reboot.
- **FR-006**: A single server instance MUST host multiple concurrent, independent games without cross-game interference.
- **FR-007**: Merging to `main` (with CI green) MUST automatically rebuild and publish the client without manual steps.
- **FR-008**: A failed client build MUST NOT take down the currently live client.
- **FR-009**: The server MUST be updatable via a single documented, repeatable deploy procedure.
- **FR-010**: Local development MUST continue to work with no deployment configuration present (unchanged developer experience).
- **FR-011**: Any credentials or secrets required for deployment MUST NOT be committed to the repository.
- **FR-012**: The public deployment MUST incur no recurring monetary cost (free hosting tiers).
- **FR-013**: The public client URL MUST be stable enough to place on a CV (it does not change on every deploy).

### Key Entities

- **Client deployment**: The publicly served static build of the front-end, addressed by a stable public URL, configured at build time with the server's address.
- **Server deployment**: The always-on back-end process hosting real-time game connections and the in-memory state of all concurrent games, fronted by a secure public endpoint.
- **Deploy trigger**: The event/procedure that publishes new code — automatic for the client (push to `main`), repeatable-and-documented for the server.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor opening the public URL after the deployment has been idle for hours can host a game within 5 seconds (no cold-start stall).
- **SC-002**: Two visitors can play a full real-time round end-to-end over the public deployment with no connection or security errors.
- **SC-003**: Multiple games run at the same time on the deployment without affecting each other's state.
- **SC-004**: A change merged to `main` appears on the live public client within 5 minutes with zero manual deploy actions.
- **SC-005**: The server resumes serving automatically within minutes of a host reboot, with no manual login required.
- **SC-006**: The deployment runs at $0 recurring monthly cost.
- **SC-007**: Running the app locally requires no deployment configuration and behaves exactly as it did before this feature.

## Assumptions

- The client and server are deployed to two different hosts: a free static host for the client and a free always-on self-managed VM for the server.
- A single server process serves all concurrent games; horizontal scaling across multiple server processes is out of scope (in-memory game state is not shared between processes).
- Loss of in-memory game state on server restart/redeploy is acceptable (no game-state persistence is in scope).
- A domain or stable host-provided hostname is available for the server so an HTTPS certificate can be issued; obtaining a custom domain is optional.
- The author is willing to perform one-time manual host setup (account creation, VM provisioning, proxy/TLS configuration).
- The existing CI gate on `main` remains the quality bar that precedes any client auto-deploy.
- Traffic volume is low (portfolio/demo usage), so free-tier resource limits are sufficient.
