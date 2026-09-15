#!/bin/zsh
#
# install.sh — set up the dharma-practice (balladharma) web app's launchd
# services on the Mac mini: com.dharma.web (the app itself, on port 8098)
# and com.dharma.updatecheck (the 5-minute auto-deployer). Idempotent —
# safe to re-run.
#
# Usage:
#   scripts/mini/install.sh
#   scripts/mini/install.sh --status
#   scripts/mini/install.sh --help
#
# What this script does:
#   1. Creates ~/Library/Logs/dharma/ if missing.
#   2. Warns (does not fail) if .env.local is missing at the repo root.
#      Never prints env values — secrets are copied in by hand, out of
#      scope here.
#   3. Copies com.dharma.web.plist and com.dharma.updatecheck.plist to
#      ~/Library/LaunchAgents/.
#   4. Prints the exact `launchctl bootstrap` commands to run — it does
#      NOT run them. Starting/loading the services is a separate, human-
#      gated step (an operator runs the printed commands themselves after
#      reviewing everything).
#
# This deliberately stops short of Favourites' install.sh, which also
# bootstraps the jobs and runs deploy.sh for the first build. Here that
# first bootstrap + first deploy is left to the operator.
#
# Env vars:
#   DRY_RUN   Set to 1 to print what would happen instead of doing it.

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_DIR="${SCRIPT_DIR:h:h}"
LOG_DIR="$HOME/Library/Logs/dharma"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
DRY_RUN="${DRY_RUN:-0}"

LABELS=(com.dharma.web com.dharma.updatecheck)

log() {
  print -- "[install] $*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN would run: $*"
  else
    "$@"
  fi
}

usage() {
  cat <<'EOF'
Usage: scripts/mini/install.sh
       scripts/mini/install.sh --status
       scripts/mini/install.sh --help

Copies the dharma-practice launchd plists (com.dharma.web,
com.dharma.updatecheck) into ~/Library/LaunchAgents/ and prints the
launchctl bootstrap commands to run. Does NOT start/load anything itself —
that's a separate, human-gated step: review the printed commands, then run
them yourself.

  --status   Print launchd status for both jobs (loaded or not, pid, last
             exit) plus repo branch/sha and /api/health, without changing
             anything.
  --help     Show this message and exit. No side effects.

Env:
  DRY_RUN=1  Print what would happen instead of doing it (no file copies).
EOF
}

do_status() {
  log "launchd status:"
  for label in "${LABELS[@]}"; do
    print -- "--- $label ---"
    launchctl print "gui/$(id -u)/$label" 2>&1 | grep -E "^\s*(state|pid|last exit)" || print -- "  not loaded"
  done

  if [[ -d "$REPO_DIR/.git" ]]; then
    print -- "--- repo ---"
    (cd "$REPO_DIR" && print -- "branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)  sha: $(git rev-parse --short HEAD 2>/dev/null)")
  fi

  print -- "--- health ---"
  curl -fsS --max-time 3 http://127.0.0.1:8098/api/health 2>&1 || print -- "  (no response on 127.0.0.1:8098)"
}

MODE="install"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --status)
      MODE="status"
      shift
      ;;
    *)
      print -u2 -- "error: unknown argument '$1' (see --help)"
      exit 1
      ;;
  esac
done

if [[ "$MODE" == "status" ]]; then
  do_status
  exit 0
fi

log "repo: $REPO_DIR"
mkdir -p "$LOG_DIR"
log "log dir ready: $LOG_DIR"

ENV_LOCAL="$REPO_DIR/.env.local"
if [[ ! -f "$ENV_LOCAL" ]]; then
  log "WARNING: $ENV_LOCAL is missing. The app will not start correctly without it."
  log "Copy it from a working machine (mode 600). Values are never printed by this script."
else
  log "found .env.local"
fi

log "copying plists to $LAUNCH_AGENTS_DIR"
mkdir -p "$LAUNCH_AGENTS_DIR"
for label in "${LABELS[@]}"; do
  run cp "$SCRIPT_DIR/${label}.plist" "$LAUNCH_AGENTS_DIR/${label}.plist"
done

log "plists copied. This script does NOT start anything itself."
log ""
log "To load and start the services, an operator should review the plists"
log "at $LAUNCH_AGENTS_DIR and then run:"
log ""
for label in "${LABELS[@]}"; do
  print -- "    launchctl bootstrap gui/$(id -u) $LAUNCH_AGENTS_DIR/${label}.plist"
done
log ""
log "After that, check status with: scripts/mini/install.sh --status"
log "or run a one-off health check with: scripts/mini/healthcheck.sh"
