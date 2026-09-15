#!/bin/zsh
#
# deploy.sh — the self-updating deploy for the dharma-practice (balladharma)
# web app on the Mac mini. Combines Favourites' check-and-deploy.sh +
# deploy.sh into one script (there is no separate check-and-deploy.sh here).
#
# Run every 300s by the com.dharma.updatecheck launchd timer, and safe to
# run by hand any time:
#
#   scripts/mini/deploy.sh
#
# What it does, in order:
#   1. Takes a lock (mkdir, atomic) so overlapping runs stand down instead
#      of racing. If a stale lock is found (older than STALE_LOCK_SEC, e.g.
#      the previous holder was SIGKILLed and never ran its EXIT trap), logs
#      a warning and reclaims it rather than staying wedged forever. This
#      fixes a known bug in Favourites' equivalent script, where a stale
#      lock could block deploys indefinitely.
#   2. Confirms the checkout is on DEPLOY_BRANCH; if not, stands down
#      (leaves whatever is on disk running/deployed as-is).
#   3. `git fetch origin $DEPLOY_BRANCH`. If the fetch fails, or local HEAD
#      already matches origin, stands down — nothing to do.
#   4. Before touching the working tree: refuses to proceed if there are
#      any uncommitted changes (`git status --porcelain` non-empty). This
#      fixes a known bug in Favourites' equivalent flow, which could run
#      `git reset --hard` and silently destroy in-flight/uncommitted work.
#      Here we only ever fast-forward (`git merge --ff-only`), and abort
#      loudly instead of forcing anything if the tree is dirty or history
#      has diverged.
#   5. `npm ci` (installs exactly what's in package-lock.json).
#   6. `npm run build` (this repo's build script runs `next build --webpack`
#      — required for PWA/service-worker compatibility, see project
#      CLAUDE.md).
#   7. If the com.dharma.web launchd job is loaded, kickstarts it (restarts
#      under KeepAlive). If it isn't installed yet, says so and leaves it —
#      that's install.sh + the operator's job the first time.
#   8. Polls http://127.0.0.1:8098/api/health every 5s for up to 180s and
#      prints the JSON it gets back.
#
# Env vars:
#   DEPLOY_BRANCH      Branch to track (default: mini-migration)
#   DHARMA_STALE_LOCK_SEC  Age in seconds after which an abandoned lock is
#                      force-reclaimed (default: 1800 = 30 minutes)
#   DRY_RUN            Set to 1 to print what would run instead of running
#                       it (fetch still happens read-only; ff-merge, npm
#                       ci/build, kickstart and the health poll are skipped)
#
# Never echoes secrets. Reads no .env* file directly — npm/next do that.

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_DIR="${SCRIPT_DIR:h:h}"
LOG_DIR="$HOME/Library/Logs/dharma"
PORT=8098
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-mini-migration}"
STALE_LOCK_SEC="${DHARMA_STALE_LOCK_SEC:-1800}"
DRY_RUN="${DRY_RUN:-0}"
LOCK_DIR="$LOG_DIR/.deploy.lock"

mkdir -p "$LOG_DIR"

log() {
  print -- "$(date '+%Y-%m-%d %H:%M:%S') [deploy] $*"
}

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN would run: $*"
  else
    "$@"
  fi
}

# --- lock acquisition, with staleness handling ---
# mkdir is atomic; a lock older than STALE_LOCK_SEC is assumed abandoned
# (previous holder SIGKILLed, crashed, or the mini rebooted mid-deploy —
# its EXIT trap never ran to clean up) and is force-reclaimed instead of
# wedging every future run forever.
acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    return 0
  fi

  if [[ -d "$LOCK_DIR" ]]; then
    local lock_mtime lock_age
    lock_mtime=$(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)
    lock_age=$(( $(date +%s) - lock_mtime ))
    if (( lock_age > STALE_LOCK_SEC )); then
      log "WARNING: lock at $LOCK_DIR is ${lock_age}s old (> ${STALE_LOCK_SEC}s) — assuming abandoned, reclaiming"
      rmdir "$LOCK_DIR" 2>/dev/null || true
      if mkdir "$LOCK_DIR" 2>/dev/null; then
        return 0
      fi
    fi
  fi

  return 1
}

if ! acquire_lock; then
  log "stand down — another deploy is already in progress ($LOCK_DIR)"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

cd "$REPO_DIR"
log "repo: $REPO_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "DETACHED")"
if [[ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]]; then
  log "stand down — checked out on '$CURRENT_BRANCH', deploy branch is '$DEPLOY_BRANCH'"
  exit 0
fi

log "fetching origin/$DEPLOY_BRANCH"
if ! git fetch --quiet origin "$DEPLOY_BRANCH"; then
  log "stand down — git fetch origin $DEPLOY_BRANCH failed"
  exit 0
fi

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$DEPLOY_BRANCH")"

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  log "up to date at ${LOCAL_SHA:0:7} — nothing to do"
  exit 0
fi

log "origin/$DEPLOY_BRANCH moved (${LOCAL_SHA:0:7} -> ${REMOTE_SHA:0:7}) — updating"

# --- dirty-tree guard: never blindly reset/force anything away ---
if [[ -n "$(git status --porcelain)" ]]; then
  log "ABORT: working tree has uncommitted changes — refusing to touch it (no reset/clean is ever run by this script)."
  log "Uncommitted changes:"
  git status --porcelain | while IFS= read -r line; do log "  $line"; done
  log "Resolve by hand (commit, stash, or discard the changes) then re-run scripts/mini/deploy.sh."
  exit 1
fi

log "fast-forwarding to origin/$DEPLOY_BRANCH"
if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN would run: git merge --ff-only origin/$DEPLOY_BRANCH"
else
  if ! git merge --ff-only "origin/$DEPLOY_BRANCH"; then
    log "ABORT: fast-forward merge failed — local history has diverged from origin/$DEPLOY_BRANCH. Refusing to force it. Resolve by hand."
    exit 1
  fi
fi

log "npm ci"
run npm ci

log "npm run build"
run npm run build

if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN would check whether com.dharma.web is loaded and kickstart it"
else
  if launchctl print "gui/$(id -u)/com.dharma.web" >/dev/null 2>&1; then
    log "restarting com.dharma.web"
    launchctl kickstart -k "gui/$(id -u)/com.dharma.web"
  else
    log "com.dharma.web is not installed/loaded yet — nothing to restart (install.sh + the operator's bootstrap start it the first time)"
  fi
fi

if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN — skipping health poll"
  log "done (dry run)"
  exit 0
fi

log "polling $HEALTH_URL (up to 180s)"
ELAPSED=0
INTERVAL=5
TIMEOUT=180
while (( ELAPSED < TIMEOUT )); do
  if BODY="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)"; then
    log "healthy after ${ELAPSED}s: $BODY"
    exit 0
  fi
  sleep "$INTERVAL"
  ELAPSED=$(( ELAPSED + INTERVAL ))
done

log "health check did not return 200 within ${TIMEOUT}s — deploy did NOT verify healthy"
exit 1
