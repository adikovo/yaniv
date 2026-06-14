# Quickstart: GitHub Actions CI Pipeline

How to verify the CI feature works, both locally and on GitHub.

## Prerequisites

- Repo pushed to GitHub (`github.com/adikovo/yaniv`), Actions enabled.
- Node 22 locally is NOT required (CI pins it); local can stay on your current version.

## 1. Verify the Playwright config change locally

The config edit must not break your local headed debugging:

```bash
# from repo root — should open headed Chromium with slowMo, starting server+client itself
npx playwright test

# simulate CI locally — should run headless, no slowMo
CI=true npx playwright test
```

Both runs should pass. In the `CI=true` run, no browser window appears and the suite is faster. Playwright should start the server (3000) and client (5173) automatically — you do NOT need to run `npm run dev` / `npm start` first.

## 2. Verify unit suites still pass standalone

```bash
cd client && npm test    # vitest run — expect all green
cd ../server && npm test  # jest — expect all green
```

## 3. Verify the workflow on GitHub

1. Push the branch and open a PR to `main`.
2. On the PR's **Checks** tab, confirm three checks appear: `client-unit`, `server-unit`, `e2e`.
3. Confirm all three go green (within ~10 min).
4. Push a commit directly to a branch (no PR) → confirm only `client-unit` and `server-unit` run, NOT `e2e`.

## 4. Verify failure reporting & artifacts

1. Temporarily break one e2e assertion on a branch, open/update the PR.
2. Confirm the `e2e` check goes red and the workflow fails.
3. On the failed run, confirm the **Artifacts** section offers the Playwright HTML report and `test-results/` for download.
4. Revert the break.

## 5. (Manual, repo owner) Enforce required checks

Outside this feature's scope, but to make CI a real merge gate:

- GitHub → Settings → Branches → Branch protection rule for `main`
- Require status checks to pass: select `client-unit`, `server-unit`, `e2e`.

## Done when

- All three checks run with the correct trigger split (SC-001, SC-002).
- A green PR needs zero manual verification steps (SC-003).
- Failure artifacts are downloadable for 7 days (SC-004).
- No secrets or paid services used (SC-005).
