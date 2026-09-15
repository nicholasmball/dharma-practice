#!/bin/zsh
#
# healthcheck.sh — one-shot health check for dharma-practice (balladharma)
# on the Mac mini. Curls the app's /api/health endpoint and exits non-zero
# unless it responds with {"ok":true,...}.
#
# Usage:
#   scripts/mini/healthcheck.sh
#
# Env vars:
#   DHARMA_HEALTH_URL   default http://127.0.0.1:8098/api/health
#
# Never echoes secrets.

set -euo pipefail

HEALTH_URL="${DHARMA_HEALTH_URL:-http://127.0.0.1:8098/api/health}"

BODY="$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null)" || {
  print -u2 -- "healthcheck: no response from $HEALTH_URL"
  exit 1
}

if print -- "$BODY" | grep -q '"ok":true'; then
  print -- "healthcheck: ok — $BODY"
  exit 0
else
  print -u2 -- "healthcheck: unhealthy response from $HEALTH_URL — $BODY"
  exit 1
fi
