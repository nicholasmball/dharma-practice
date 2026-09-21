#!/bin/zsh
#
# check-install-files.sh — proves that the phone-install files (the PWA
# manifest, icons, offline files, screenshots) are reachable WITHOUT
# signing in, while every other page on the site still demands sign-in.
#
# Background: the whole site sits behind Cloudflare Access (a login wall).
# A phone installing the app as a home-screen icon has to fetch the
# manifest and icon files before the user has ever signed in, so those
# specific files are deliberately let through by a second, narrower
# Cloudflare Access application ("dharma install files (public)", set up
# by hand in the Cloudflare dashboard — see the Troubleshooting/Deployment
# section of CLAUDE.md) with a Bypass policy. Everything else stays behind
# the original "dharma" application. This script is a repeatable way to
# prove that split is still working, e.g. after a Cloudflare change.
#
# Usage:
#   scripts/mini/check-install-files.sh [BASE_URL]
#   DHARMA_CHECK_BASE_URL=https://dharma.balla-bot.uk scripts/mini/check-install-files.sh
#
# BASE_URL (positional, optional) overrides DHARMA_CHECK_BASE_URL, which
# defaults to https://dharma.balla-bot.uk.
#
# Env vars (mainly for proving the failure path — see below):
#   DHARMA_CHECK_BASE_URL      default https://dharma.balla-bot.uk
#   DHARMA_CHECK_INSTALL_PATHS default: the install files listed below.
#                               Space-separated, no leading slash.
#   DHARMA_CHECK_PROTECTED_PATHS default: a handful of real pages/routes.
#                               Space-separated, no leading slash.
#
# What it checks, with plain curl and no cookies (i.e. as a signed-out
# visitor):
#   - each install path returns HTTP 200
#   - each protected path redirects (HTTP 301/302/307/308) to a
#     *.cloudflareaccess.com login URL
#
# Exit code: 0 if everything matches, 1 on any mismatch (with a clear
# message per failure), 2 on a usage error.
#
# Proving the failure path (per the task that added this script): point
# DHARMA_CHECK_INSTALL_PATHS at a path that's actually protected, e.g.
#   DHARMA_CHECK_INSTALL_PATHS=dashboard scripts/mini/check-install-files.sh
# or point DHARMA_CHECK_BASE_URL at a bogus host — either way this script
# exits non-zero and prints exactly what didn't match.
#
# Loop variables below are named "p", never "path" — in zsh, the lowercase
# parameter "path" is a special array tied directly to $PATH, so assigning
# a URL path segment to a variable called "path" silently clobbers the
# shell's command search path and everything after it (including curl
# itself) stops resolving, with no error pointing at the real cause. This
# cost real time to track down, hence the note.

set -uo pipefail
setopt null_glob

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      sed -n '2,40p' "$0"
      exit 0
      ;;
  esac
done

if (( $# > 1 )); then
  print -u2 -- "error: too many arguments (see --help)"
  exit 2
fi

BASE_URL="${1:-${DHARMA_CHECK_BASE_URL:-https://dharma.balla-bot.uk}}"
# Strip a trailing slash so "$BASE_URL/$p" never ends up with "//".
BASE_URL="${BASE_URL%/}"

INSTALL_PATHS_RAW="${DHARMA_CHECK_INSTALL_PATHS:-manifest.json icons/icon-192.png icons/icon-512.png sw.js screenshots/timer.png icon.svg}"
PROTECTED_PATHS_RAW="${DHARMA_CHECK_PROTECTED_PATHS:-dashboard teacher settings api/chat}"
INSTALL_PATHS=(${=INSTALL_PATHS_RAW})
PROTECTED_PATHS=(${=PROTECTED_PATHS_RAW})

FAILURES=()

echo "Checking install files (expect 200, no sign-in) against $BASE_URL"
for p in "${INSTALL_PATHS[@]}"; do
  url="$BASE_URL/$p"
  code="$(curl -sI -o /dev/null -m 10 -w '%{http_code}' "$url")"
  if [[ "$code" == "200" ]]; then
    echo "  OK   $p -> $code"
  else
    echo "  FAIL $p -> $code (expected 200)"
    FAILURES+=("install file $p returned $code, not 200")
  fi
done

echo
echo "Checking protected pages (expect a redirect to the Cloudflare sign-in page) against $BASE_URL"
for p in "${PROTECTED_PATHS[@]}"; do
  url="$BASE_URL/$p"
  code="$(curl -sI -o /dev/null -m 10 -w '%{http_code}' "$url")"
  case "$code" in
    301|302|307|308)
      loc="$(curl -sI -m 10 "$url" | grep -i '^location:' | head -1 | sed -E 's/^[Ll]ocation: *//' | tr -d '\r')"
      if [[ "$loc" == *.cloudflareaccess.com* ]]; then
        echo "  OK   $p -> $code, redirected to Cloudflare sign-in"
      else
        echo "  FAIL $p -> $code, but redirected somewhere unexpected: ${loc:-<no Location header>}"
        FAILURES+=("protected path $p redirected (=$code) but not to cloudflareaccess.com: ${loc:-<none>}")
      fi
      ;;
    200)
      echo "  FAIL $p -> 200 (this page is NOT asking for sign-in — that's a real problem)"
      FAILURES+=("protected path $p returned 200 instead of a sign-in redirect")
      ;;
    *)
      echo "  FAIL $p -> $code (expected a 301/302/307/308 redirect to sign-in)"
      FAILURES+=("protected path $p returned $code, not a sign-in redirect")
      ;;
  esac
done

echo
if (( ${#FAILURES[@]} == 0 )); then
  echo "All checks passed."
  exit 0
fi

echo "FAILED — ${#FAILURES[@]} check(s) did not match what's expected:"
for f in "${FAILURES[@]}"; do
  echo "  - $f"
done
exit 1
