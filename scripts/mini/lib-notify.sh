#!/bin/zsh
#
# lib-notify.sh — Telegram alert sender for the dharma-practice mini
# scripts, matching Favourites' lib.sh mechanism exactly (same BallaBot
# invocation, same fallback, same "never fail the caller" contract).
#
# Source this, don't execute it:
#   source "${0:A:h}/lib-notify.sh"
#
# Functions:
#   notify_telegram <topic> <msg> [output_log]
#     Sends a Telegram alert via BallaBot's sender (retries once without
#     --topic), falling back to a skip if ~/balla-bot isn't present or
#     both attempts fail. Never fails the caller — always returns 0.
#     output_log (optional) captures BallaBot's own stdout/stderr;
#     defaults to /dev/null if not given.
#
# Never echoes secrets. This file has no side effects when sourced beyond
# defining a function.

notify_telegram() {
  local topic="$1"
  local message="$2"
  local output_log="${3:-/dev/null}"

  if [[ ! -d "$HOME/balla-bot" ]]; then
    print -- "skipped — ~/balla-bot not found"
    return 0
  fi

  if ( cd "$HOME/balla-bot" && ./.venv/bin/python -m scripts.telegram_send --topic "$topic" "$message" ) >>"$output_log" 2>&1; then
    print -- "sent (topic: $topic)"
    return 0
  fi

  if ( cd "$HOME/balla-bot" && ./.venv/bin/python -m scripts.telegram_send "$message" ) >>"$output_log" 2>&1; then
    print -- "sent (no topic — $topic not registered?)"
    return 0
  fi

  print -- "FAILED to send — see $output_log"
  return 0
}
