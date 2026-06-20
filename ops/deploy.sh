#!/usr/bin/env bash
# Server deploy script, run on the Oracle VM by the GitHub Actions SSH job
# (.github/workflows/deploy-server.yml) after CI passes on main.
#
# Pulls the latest code, installs production deps, and restarts the pm2
# process. Uses `pm2 restart` (NOT --update-env) on purpose so the
# CLIENT_ORIGIN captured at first start + `pm2 save` is preserved.
set -euo pipefail

cd "$HOME/yaniv"
git pull --ff-only origin main

cd server
npm ci --omit=dev
pm2 restart yaniv
