#!/bin/zsh
#
# healthcheck.sh — periodic health check for dharma-practice (balladharma)
# on the Mac mini. Checks the web app, PostgREST, and backup freshness;
# alerts via Telegram (through lib-notify.sh's notify_telegram) after two
# consecutive bad runs, re-alerting at most once an hour, and sends a
# "recovered" message once things are healthy again. Silent (one log
# line) on a clean run. Mirrors Favourites' scripts/mini/healthcheck.sh
# conventions, including the state-lock fix for the alert/recover TOCTOU
# race described in its header.
#
# Usage:
#   scripts/mini/healthcheck.sh
#
# Checks:
#   - health URL (http://127.0.0.1:8098/api/health) returns HTTP 200 and
#     its body contains "ok":true
#   - PostgREST root (http://127.0.0.1:8097/) returns HTTP 200
#   - newest dharma-*.dump in BACKUP_DIR is younger than
#     DHARMA_BACKUP_MAX_AGE_HOURS (an unreachable/missing backup dir counts
#     as this check failing too — there's no separate "NAS unmounted"
#     alert, the staleness check covers it)
#   - the deploy diary (~/Library/Logs/dharma/deploy.log, written by
#     deploy.sh's launchd StandardOutPath) has been touched within
#     DHARMA_DEPLOY_SILENCE_MIN minutes — only checked if the file exists,
#     so a box that's never run deploy.sh doesn't alert
#
# Skips everything (log one line, exit 0) if the deploy lock dir
# (~/Library/Logs/dharma/.deploy.lock, created by deploy.sh) exists — a
# deploy in progress can legitimately make the app briefly unhealthy or
# the diary momentarily stale.
#
# State is kept in a plain key=value file (DHARMA_STATE_FILE, default
# $LOG_DIR/healthcheck-state.json despite the .json name — it's flat
# key=value, not real JSON, to avoid a jq dependency on the mini) tracking
# consecutive_failures, last_alert_epoch, alerting, and last_failures.
# Alerting rule: alert only once consecutive_failures >= 2, and only if
# not already alerting OR the last alert was over an hour ago.
#
# The state read/decide/alert/save section is serialised by its own
# mkdir-based lock (STATE_LOCK_DIR, .healthcheck-state.lock — separate
# from deploy.sh's deploy LOCK_DIR above) so two overlapping healthcheck
# runs can't both read the same "about to recover" state and both fire an
# alert (a TOCTOU race). The checks themselves (health URL, PostgREST,
# backup freshness, diary silence) run BEFORE the lock is taken, so a run
# that loses the lock still skips only the state/alert bookkeeping, not
# the actual health probing. A lock older than STALE_LOCK_SEC is assumed
# abandoned (e.g. the previous holder was SIGKILLed, so its EXIT trap
# never ran) and is force-reclaimed.
#
# Env vars:
#   DHARMA_HEALTH_URL           default http://127.0.0.1:8098/api/health
#   DHARMA_POSTGREST_URL        default http://127.0.0.1:8097/
#   DHARMA_BACKUP_DIR           default /Volumes/Public/dharma-backups
#   DHARMA_BACKUP_MAX_AGE_HOURS default 26
#   DHARMA_LOG_DIR              default ~/Library/Logs/dharma
#   DHARMA_STATE_FILE           default $LOG_DIR/healthcheck-state.json
#   DHARMA_DEPLOY_DIARY         default $LOG_DIR/deploy.log
#   DHARMA_DEPLOY_SILENCE_MIN   default 30
#   TELEGRAM_TOPIC              default dharma-health
#   DHARMA_NOTIFY               default 1 — set 0 to skip Telegram (tests)
#   DHARMA_STATE_LOCK_STALE_SEC default 120 — age (seconds) after which an
#                               abandoned .healthcheck-state.lock is
#                               force-reclaimed (tests)
#   DHARMA_TEST_LOCK_HOLD_SEC   default 0 — sleep this long after taking
#                               the state lock, to force two runs to
#                               overlap on it deterministically (tests only)
#
# Exit code: 0 always (this runs under a launchd interval timer and should
# never look "crashed" to launchd over an app-level problem), except exit 2
# on a usage error (unknown argument).
#
# Never echoes secrets.

set -euo pipefail
setopt null_glob  # unmatched globs (e.g. no dharma-*.dump yet) expand to nothing, not an error

SCRIPT_DIR="${0:A:h}"
source "$SCRIPT_DIR/lib-notify.sh"

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      sed -n '2,70p' "$0"
      exit 0
      ;;
    *)
      print -u2 -- "error: unknown argument '$arg' (see --help)"
      exit 2
      ;;
  esac
done

HEALTH_URL="${DHARMA_HEALTH_URL:-http://127.0.0.1:8098/api/health}"
POSTGREST_URL="${DHARMA_POSTGREST_URL:-http://127.0.0.1:8097/}"
BACKUP_DIR="${DHARMA_BACKUP_DIR:-/Volumes/Public/dharma-backups}"
MAX_AGE_HOURS="${DHARMA_BACKUP_MAX_AGE_HOURS:-26}"
LOG_DIR="${DHARMA_LOG_DIR:-$HOME/Library/Logs/dharma}"
STATE_FILE="${DHARMA_STATE_FILE:-$LOG_DIR/healthcheck-state.json}"
DEPLOY_DIARY="${DHARMA_DEPLOY_DIARY:-$LOG_DIR/deploy.log}"
SILENCE_MIN="${DHARMA_DEPLOY_SILENCE_MIN:-30}"
TELEGRAM_TOPIC="${TELEGRAM_TOPIC:-dharma-health}"
DHARMA_NOTIFY="${DHARMA_NOTIFY:-1}"
LOCK_DIR="$LOG_DIR/.deploy.lock"
STATE_LOCK_DIR="$LOG_DIR/.healthcheck-state.lock"
STALE_LOCK_SEC="${DHARMA_STATE_LOCK_STALE_SEC:-120}"

mkdir -p "$LOG_DIR"
HC_LOG="$LOG_DIR/healthcheck.log"

log() {
  print -- "$(date '+%Y-%m-%d %H:%M:%S') — $*" >> "$HC_LOG"
}

# --- skip if a deploy is in progress ---
if [[ -d "$LOCK_DIR" ]]; then
  log "deploy in progress, skipped"
  exit 0
fi

# Wraps notify_telegram, honouring DHARMA_NOTIFY=0 for tests — prints
# the same style of outcome string notify_telegram would, for logging.
send_alert() {
  if [[ "$DHARMA_NOTIFY" == "1" ]]; then
    notify_telegram "$TELEGRAM_TOPIC" "$1" "$HC_LOG"
  else
    print -- "skipped — DHARMA_NOTIFY=0"
  fi
}

# --- run checks ---
FAILED=()

# 1. health URL
if HEALTH_BODY="$(curl -fsS -m 5 "$HEALTH_URL" 2>/dev/null)" && print -- "$HEALTH_BODY" | grep -q '"ok":true'; then
  :
else
  FAILED+=("health-url")
fi

# 2. PostgREST root
if ! curl -fsS -m 5 -o /dev/null "$POSTGREST_URL" 2>/dev/null; then
  FAILED+=("postgrest")
fi

# 3. backup freshness (unreachable dir counts as failing this check too)
# Glob qualifiers: (N) = empty array instead of an error when nothing
# matches, (om) = order by mtime, newest first.
NEWEST_DUMP=""
if [[ -d "$BACKUP_DIR" ]]; then
  DUMP_CANDIDATES=("$BACKUP_DIR"/dharma-*.dump(N.om))
  if (( ${#DUMP_CANDIDATES[@]} > 0 )); then
    NEWEST_DUMP="${DUMP_CANDIDATES[1]}"
  fi
fi
if [[ -z "$NEWEST_DUMP" ]]; then
  FAILED+=("backup-stale")
else
  MTIME=$(stat -f %m "$NEWEST_DUMP" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE_HOURS=$(( (NOW - MTIME) / 3600 ))
  if (( AGE_HOURS >= MAX_AGE_HOURS )); then
    FAILED+=("backup-stale")
  fi
fi

# 4. deploy diary silence — only if the file exists
if [[ -f "$DEPLOY_DIARY" ]]; then
  DMTIME=$(stat -f %m "$DEPLOY_DIARY" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  SILENCE_MINUTES=$(( (NOW - DMTIME) / 60 ))
  if (( SILENCE_MINUTES >= SILENCE_MIN )); then
    FAILED+=("deploy-diary-silent")
  fi
fi

# --- take the state lock: everything from here (read state, decide, alert,
# save) is the critical section. The checks above already ran unlocked. ---
LOCK_ACQUIRED=0
for attempt in 1 2; do
  if mkdir "$STATE_LOCK_DIR" 2>/dev/null; then
    LOCK_ACQUIRED=1
    break
  fi
  # Reclaim a stale lock: if it's older than STALE_LOCK_SEC, the previous
  # holder almost certainly died without running its EXIT trap (e.g.
  # SIGKILL) rather than still being mid-run. Force it away and retry once.
  if [[ -d "$STATE_LOCK_DIR" ]]; then
    LOCK_MTIME=$(stat -f %m "$STATE_LOCK_DIR" 2>/dev/null || echo 0)
    LOCK_AGE=$(( $(date +%s) - LOCK_MTIME ))
    if (( LOCK_AGE > STALE_LOCK_SEC )); then
      rmdir "$STATE_LOCK_DIR" 2>/dev/null || true
      continue
    fi
  fi
  break
done

if (( LOCK_ACQUIRED == 0 )); then
  log "another check is running, skipped"
  exit 0
fi
trap 'rmdir "$STATE_LOCK_DIR" 2>/dev/null' EXIT

# Test-only seam: widen the critical section on demand so a concurrency
# test can deterministically force two runs to overlap on the lock instead
# of relying on real timing. No-op (default 0) outside tests.
if (( ${DHARMA_TEST_LOCK_HOLD_SEC:-0} > 0 )); then
  sleep "$DHARMA_TEST_LOCK_HOLD_SEC"
fi

# --- state: consecutive_failures, last_alert_epoch, alerting, last_failures ---
consecutive_failures=0
last_alert_epoch=0
alerting=false
last_failures=""

if [[ -f "$STATE_FILE" ]]; then
  # Plain key=value, one per line, written only by this script — safe to
  # read field-by-field without sourcing arbitrary content.
  while IFS='=' read -r key value; do
    case "$key" in
      consecutive_failures) consecutive_failures="$value" ;;
      last_alert_epoch) last_alert_epoch="$value" ;;
      alerting) alerting="$value" ;;
      last_failures) last_failures="$value" ;;
    esac
  done < "$STATE_FILE"
fi

save_state() {
  # Write to a temp file then mv (same pattern as backup-db.sh's staging ->
  # final rename) so a reader never sees a half-written state file — mv
  # within the same directory is atomic on APFS/HFS+.
  local tmp="$STATE_FILE.tmp.$$"
  cat > "$tmp" <<EOF
consecutive_failures=$1
last_alert_epoch=$2
alerting=$3
last_failures=$4
EOF
  mv "$tmp" "$STATE_FILE"
}

NOW_EPOCH=$(date +%s)

if (( ${#FAILED[@]} == 0 )); then
  if [[ "$alerting" == "true" ]]; then
    MSG="Dharma health check on the mini has RECOVERED — all checks passing again."
    RESULT="$(send_alert "$MSG")"
    log "recovered — all checks passing; alert: $RESULT"
  else
    log "healthy — all checks passing"
  fi
  save_state 0 "$last_alert_epoch" false ""
  exit 0
fi

# --- failure path ---
FAILED_LIST="${(j:,:)FAILED}"
consecutive_failures=$(( consecutive_failures + 1 ))

SHOULD_ALERT=0
if (( consecutive_failures >= 2 )); then
  if [[ "$alerting" != "true" ]]; then
    SHOULD_ALERT=1
  else
    ELAPSED=$(( NOW_EPOCH - last_alert_epoch ))
    if (( ELAPSED > 3600 )); then
      SHOULD_ALERT=1
    fi
  fi
fi

if (( SHOULD_ALERT == 1 )); then
  MSG="Dharma health check on the mini FAILED (${consecutive_failures} in a row): ${FAILED_LIST}. See ${HC_LOG}."
  RESULT="$(send_alert "$MSG")"
  log "FAILED (${consecutive_failures} in a row): ${FAILED_LIST} — alert: $RESULT"
  save_state "$consecutive_failures" "$NOW_EPOCH" true "$FAILED_LIST"
else
  log "FAILED (${consecutive_failures} in a row): ${FAILED_LIST} — not yet alerting (need 2 consecutive, or hourly re-alert window not reached)"
  save_state "$consecutive_failures" "$last_alert_epoch" "$alerting" "$FAILED_LIST"
fi

exit 0
