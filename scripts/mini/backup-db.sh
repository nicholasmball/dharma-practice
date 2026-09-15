#!/bin/zsh
#
# backup-db.sh — nightly database dump of `dharma` to the NAS, mirroring
# Favourites' scripts/mini/backup-db.sh conventions exactly (same
# tmp-then-mv pattern, same sanity checks, same weekly globals file, same
# pruning and alerting behaviour) but sized for dharma's much smaller DB.
#
# Usage:
#   scripts/mini/backup-db.sh [--dry-run]
#
# What it does, in order:
#   1. If $DHARMA_BACKUP_DIR looks like it's under /Volumes, confirms the
#      NAS share is actually mounted (`mount | grep " on /Volumes/Public "`)
#      before doing anything else — writing to an unmounted mountpoint
#      silently lands on local disk instead of the NAS.
#   2. Ensures $DHARMA_BACKUP_DIR exists, but ONLY as a leaf directory
#      under an already-mounted share — never `mkdir -p` the mount root
#      itself (that would silently succeed on local disk if the share
#      isn't actually mounted, defeating check #1).
#   3. `pg_dump -Fc -d dharma` to a local temp file under ${TMPDIR:-/tmp}
#      (dumping to local disk first, not directly to the NAS, so a
#      slow/flaky SMB write can't produce a half-written dump that later
#      gets renamed into place).
#   4. Sanity checks: file size >= $DHARMA_BACKUP_MIN_BYTES (default 1024
#      — dharma is a tiny DB), and `pg_restore -l` lists >= 4 TABLE
#      entries (meditation_sessions, journal_entries, user_settings,
#      teacher_conversations). Either failing aborts before anything
#      touches the NAS.
#   5. Copies to $BACKUP_DIR/dharma-YYYY-MM-DD.dump.tmp, then `mv`s it to
#      the final name (removing any existing file at the final name first
#      — SMB shares can return EPERM on a direct overwrite).
#   6. On Sundays, or if no globals-*.sql file exists yet in BACKUP_DIR,
#      also writes globals-YYYY-MM-DD.sql from `pg_dumpall --globals-only`
#      (roles/passwords/grants aren't in a plain per-database pg_dump).
#   7. Prunes to the newest $DHARMA_BACKUP_KEEP dated dumps and the newest
#      5 globals files — only after every write above succeeded.
#   8. Appends one line to the backup log.
#
# On any failure: logs the reason, sends a Telegram alert (unless
# DHARMA_NOTIFY=0), and exits 1. Nothing is pruned on failure.
#
# --dry-run prints what would happen (including running pg_dump/pg_restore
# -l against the real DB to prove connectivity, but never writes to
# BACKUP_DIR and never prunes).
#
# Env vars (all optional — defaults match the mini):
#   DHARMA_DB               Database to dump (default: dharma)
#   DHARMA_BACKUP_DIR       Destination dir (default: /Volumes/Public/dharma-backups)
#   DHARMA_BACKUP_KEEP      How many daily dumps to keep (default: 30)
#   DHARMA_BACKUP_MIN_BYTES Minimum acceptable dump size (default: 1024)
#   DHARMA_LOG_DIR          Log directory (default: ~/Library/Logs/dharma)
#   TELEGRAM_TOPIC          Telegram topic to alert on (default: dharma-health)
#   DHARMA_NOTIFY           Set to 0 to skip Telegram entirely (default: 1) — for tests
#
# Never echoes secrets. Uses local trust auth (no password) like the rest
# of the mini's Postgres setup.

set -euo pipefail
setopt null_glob  # unmatched globs (e.g. no globals-*.sql yet) expand to nothing, not an error

SCRIPT_DIR="${0:A:h}"
source "$SCRIPT_DIR/lib-notify.sh"

DHARMA_DB="${DHARMA_DB:-dharma}"
BACKUP_DIR="${DHARMA_BACKUP_DIR:-/Volumes/Public/dharma-backups}"
KEEP="${DHARMA_BACKUP_KEEP:-30}"
MIN_BYTES="${DHARMA_BACKUP_MIN_BYTES:-1024}"
LOG_DIR="${DHARMA_LOG_DIR:-$HOME/Library/Logs/dharma}"
TELEGRAM_TOPIC="${TELEGRAM_TOPIC:-dharma-health}"
DHARMA_NOTIFY="${DHARMA_NOTIFY:-1}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --help|-h)
      sed -n '2,55p' "$0"
      exit 0
      ;;
    *)
      print -u2 -- "error: unknown argument '$arg' (see --help)"
      exit 2
      ;;
  esac
done

mkdir -p "$LOG_DIR"
BACKUP_LOG="$LOG_DIR/backup-db.log"

log() {
  print -- "[backup-db] $*"
}

diary() {
  print -- "$(date '+%Y-%m-%d %H:%M:%S') — $*" >> "$BACKUP_LOG"
}

fail() {
  local reason="$1"
  diary "FAILED — $reason"
  log "FAILED — $reason"
  if [[ "$DHARMA_NOTIFY" == "1" ]]; then
    local msg="Dharma nightly backup FAILED on the mini: ${reason}. See ${BACKUP_LOG}."
    local result
    result="$(notify_telegram "$TELEGRAM_TOPIC" "$msg" "$BACKUP_LOG")"
    diary "alert: $result"
  else
    diary "alert skipped — DHARMA_NOTIFY=0"
  fi
  exit 1
}

TODAY="$(date '+%Y-%m-%d')"
TMP_DUMP="${TMPDIR:-/tmp}/dharma-backup-${TODAY}-$$.dump"

cleanup() {
  [[ -f "$TMP_DUMP" ]] && rm -f "$TMP_DUMP"
}
trap cleanup EXIT

# --- step 1: confirm the NAS mount, if BACKUP_DIR is under /Volumes ---
if [[ "$BACKUP_DIR" == /Volumes/* ]]; then
  MOUNT_ROOT="/Volumes/$(print -- "$BACKUP_DIR" | awk -F/ '{print $3}')"
  if ! mount | grep -q " on ${MOUNT_ROOT} "; then
    fail "NAS share not mounted (expected \"on ${MOUNT_ROOT}\" in \`mount\` output) — backup dir would land on local disk"
  fi
  log "confirmed mounted: $MOUNT_ROOT"
else
  log "BACKUP_DIR ($BACKUP_DIR) is not under /Volumes — skipping mount check"
fi

# --- step 2: ensure BACKUP_DIR exists, only as a leaf under a mounted share ---
if [[ ! -d "$BACKUP_DIR" ]]; then
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN would run: mkdir -p '$BACKUP_DIR'"
  else
    if ! mkdir -p "$BACKUP_DIR" 2>/dev/null; then
      fail "could not create BACKUP_DIR ($BACKUP_DIR)"
    fi
    log "created $BACKUP_DIR"
  fi
else
  log "BACKUP_DIR exists: $BACKUP_DIR"
fi

# --- step 3: pg_dump to local temp file ---
log "pg_dump -Fc -d $DHARMA_DB -> $TMP_DUMP"
if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN would run: pg_dump -Fc -d '$DHARMA_DB' -f '$TMP_DUMP'"
else
  if ! pg_dump -Fc -d "$DHARMA_DB" -f "$TMP_DUMP" 2>>"$BACKUP_LOG"; then
    fail "pg_dump failed (see $BACKUP_LOG)"
  fi
fi

# --- step 4: sanity checks ---
if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN — running pg_dump/pg_restore -l against the real DB to prove connectivity, no local file will persist"
  TMP_DUMP_CHECK="${TMPDIR:-/tmp}/dharma-backup-dryrun-$$.dump"
  if pg_dump -Fc -d "$DHARMA_DB" -f "$TMP_DUMP_CHECK" 2>>"$BACKUP_LOG"; then
    SIZE=$(stat -f %z "$TMP_DUMP_CHECK" 2>/dev/null || echo 0)
    TABLE_COUNT=$(pg_restore -l "$TMP_DUMP_CHECK" 2>/dev/null | grep -c ' TABLE ' || true)
    log "DRY_RUN result: size=${SIZE} bytes, TABLE entries=${TABLE_COUNT} (min required: ${MIN_BYTES} bytes / 4 tables)"
    rm -f "$TMP_DUMP_CHECK"
  else
    log "DRY_RUN: pg_dump failed — see $BACKUP_LOG"
  fi
  log "DRY_RUN would copy to $BACKUP_DIR/dharma-${TODAY}.dump, prune to newest $KEEP, and possibly write a globals file"
  log "DRY_RUN complete — no files were written to BACKUP_DIR"
  exit 0
fi

SIZE=$(stat -f %z "$TMP_DUMP" 2>/dev/null || echo 0)
if (( SIZE < MIN_BYTES )); then
  fail "dump too small: ${SIZE} bytes (minimum ${MIN_BYTES})"
fi

TABLE_COUNT=$(pg_restore -l "$TMP_DUMP" 2>/dev/null | grep -c ' TABLE ' || true)
if (( TABLE_COUNT < 4 )); then
  fail "dump only lists ${TABLE_COUNT} TABLE entries via pg_restore -l (minimum 4) — looks incomplete"
fi

log "dump OK: ${SIZE} bytes, ${TABLE_COUNT} TABLE entries"

# --- step 5: copy to NAS, tmp-then-mv, remove existing final first ---
FINAL="$BACKUP_DIR/dharma-${TODAY}.dump"
STAGING="$BACKUP_DIR/dharma-${TODAY}.dump.tmp"

log "copying to $STAGING"
if ! cp "$TMP_DUMP" "$STAGING"; then
  fail "cp to NAS staging file failed ($STAGING) — check the share is writable"
fi

if [[ -f "$FINAL" ]]; then
  rm -f "$FINAL"
fi
if ! mv "$STAGING" "$FINAL"; then
  fail "mv staging -> final failed ($STAGING -> $FINAL)"
fi
log "wrote $FINAL"

# --- step 6: weekly (or missing) globals file ---
DOW="$(date '+%u')"  # 7 = Sunday
HAS_GLOBALS=0
EXISTING_GLOBALS=("$BACKUP_DIR"/globals-*.sql)
if (( ${#EXISTING_GLOBALS[@]} > 0 )); then
  HAS_GLOBALS=1
fi

if [[ "$DOW" == "7" || "$HAS_GLOBALS" == "0" ]]; then
  GLOBALS_FINAL="$BACKUP_DIR/globals-${TODAY}.sql"
  GLOBALS_STAGING="$BACKUP_DIR/globals-${TODAY}.sql.tmp"
  log "writing globals file: $GLOBALS_FINAL (Sunday=$([[ "$DOW" == "7" ]] && echo yes || echo no), had-existing-globals=$HAS_GLOBALS)"
  if pg_dumpall --globals-only -f "${TMPDIR:-/tmp}/dharma-globals-${TODAY}-$$.sql" 2>>"$BACKUP_LOG"; then
    cp "${TMPDIR:-/tmp}/dharma-globals-${TODAY}-$$.sql" "$GLOBALS_STAGING"
    [[ -f "$GLOBALS_FINAL" ]] && rm -f "$GLOBALS_FINAL"
    mv "$GLOBALS_STAGING" "$GLOBALS_FINAL"
    rm -f "${TMPDIR:-/tmp}/dharma-globals-${TODAY}-$$.sql"
    log "wrote $GLOBALS_FINAL"
  else
    # Globals failure doesn't fail the whole backup (the DB dump already
    # succeeded and is the thing that matters most) — but it's worth a
    # note in the diary. Roles change rarely; missing one week is low risk.
    diary "WARNING: globals-only dump failed, DB backup still succeeded (see $BACKUP_LOG)"
    log "WARNING: globals dump failed — see $BACKUP_LOG"
  fi
else
  log "not Sunday and a globals file already exists — skipping"
fi

# --- step 7: prune ---
log "pruning to newest $KEEP dated dumps"
# Filenames are dharma-YYYY-MM-DD.dump, so lexical order == date order;
# (N) makes the glob a no-op array when nothing matches instead of erroring,
# (O) reverses the (default ascending) sort so index 0 is newest.
DUMP_LIST=("$BACKUP_DIR"/dharma-*.dump(N))
DUMP_LIST=("${(O)DUMP_LIST[@]}")
if (( ${#DUMP_LIST[@]} > KEEP )); then
  for f in "${DUMP_LIST[@]:$KEEP}"; do
    log "pruning old dump: $f"
    rm -f "$f"
  done
fi

log "pruning globals files to newest 5"
GLOBALS_LIST=("$BACKUP_DIR"/globals-*.sql(N))
GLOBALS_LIST=("${(O)GLOBALS_LIST[@]}")
if (( ${#GLOBALS_LIST[@]} > 5 )); then
  for f in "${GLOBALS_LIST[@]:5}"; do
    log "pruning old globals file: $f"
    rm -f "$f"
  done
fi

# --- step 8: log line ---
diary "OK — wrote dharma-${TODAY}.dump (${SIZE} bytes, ${TABLE_COUNT} tables), kept ${#DUMP_LIST[@]} dumps / ${#GLOBALS_LIST[@]} globals files (capped at ${KEEP}/5)"
log "done"
exit 0
