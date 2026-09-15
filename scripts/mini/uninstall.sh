#!/bin/zsh
#
# uninstall.sh — rollback for the dharma-practice (balladharma) launchd
# services on the Mac mini. Boots out com.dharma.web,
# com.dharma.updatecheck, com.dharma.dbbackup, and com.dharma.healthcheck,
# and removes their copied plists from ~/Library/LaunchAgents/. Leaves the
# repo, .env.local, and logs under ~/Library/Logs/dharma untouched. Never
# touches com.dharma.postgrest, or anything under com.favourites.* /
# com.ballabot.*.
#
# This script DOES contain launchctl bootout commands — that's the point,
# it's the rollback tool — but it is not run as part of install/deploy. An
# operator runs it deliberately when they want the services gone.
#
# Usage:
#   scripts/mini/uninstall.sh
#
# Env vars:
#   DRY_RUN   Set to 1 to print what would happen instead of doing it.

set -euo pipefail

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
DRY_RUN="${DRY_RUN:-0}"

LABELS=(com.dharma.web com.dharma.updatecheck com.dharma.dbbackup com.dharma.healthcheck)

log() {
  print -- "[uninstall] $*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN would run: $*"
  else
    "$@"
  fi
}

for label in "${LABELS[@]}"; do
  log "bootout $label"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN would run: launchctl bootout gui/$(id -u)/$label"
  else
    launchctl bootout "gui/$(id -u)/$label" 2>&1 | grep -v "No such process" || true
  fi

  PLIST_DEST="$LAUNCH_AGENTS_DIR/${label}.plist"
  if [[ -f "$PLIST_DEST" ]]; then
    log "removing $PLIST_DEST"
    run rm -f "$PLIST_DEST"
  fi
done

log "done — repo, .env.local, and logs under ~/Library/Logs/dharma are untouched"
