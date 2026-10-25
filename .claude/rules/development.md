---
paths:
  - "scripts/**"
  - "package.json"
  - "vitest.config.ts"
  - "next.config.ts"
  - "src/**/__tests__/**"
---

# Development: running on a laptop and testing before a release (moved from CLAUDE.md)

### Important: a laptop cannot run this app on its own

Everything except the static UI, the timer and the PWA shell depends on services that
listen **only on loopback on the Mac mini**. Running `npm run dev` on a laptop with no
connection to the mini gives you a shell with no data, no sign-in and no teacher.

The four mini-side dependencies:

| Needs the mini | Why | Without it |
|---|---|---|
| Postgres 17 (`127.0.0.1:5432`, db `dharma`) | `DATABASE_URL`. Read directly only for `auth.users` (not exposed via PostgREST) — email→UUID lookup and account deletion | `src/lib/auth/delete-user.ts` throws `DATABASE_URL is not set` |
| PostgREST (`127.0.0.1:8097`) | `POSTGREST_URL`. **All** app data reads/writes | `src/lib/postgrest/client.ts` throws; no sessions, journal, settings or conversations |
| Auth.js + Google sign-in | `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_ALLOWED_EMAILS`, `AUTH_URL`. `AUTH_URL` must be the public hostname — from a loopback origin Google rejects with `redirect_uri_mismatch`. Also needs a seeded `auth.users` row, so it depends on Postgres too | Cannot sign in |
| Balla Bot `dharma-llm` (`127.0.0.1:8099`) | `LLM_PROVIDER=ballabot`, `DHARMA_LLM_URL`, `DHARMA_LLM_TOKEN` | Teacher chat is dead (unless you set `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`) |

**So: do your testing on the mini, not on a laptop.** This is why the old "test locally
with `npm run dev` before pushing" rule no longer works as written. What a laptop *can*
do alone: edit code, `npm run lint`, `npm test`, `npm run build`, and check static UI.

**Reaching the mini from the laptop:** `ssh mini` (home network) or `ssh mini-ts` (from
anywhere, via Tailscale) — both are set up in the laptop's `~/.ssh/config`, key-based, no
password. The repo on the mini is `~/projects/dharma-practice`. Anything that must run on
the mini can be done over SSH from a laptop session — **but wrap it in a login shell**:

```bash
ssh mini 'cd ~/projects/dharma-practice && zsh -lc "scripts/mini/deploy.sh"'
```

A plain `ssh mini '<cmd>'` shell doesn't load the login profile, so `npm`/`node`
(Homebrew, `/opt/homebrew/bin`) aren't on PATH. `deploy.sh` run that way dies at `npm ci`
*after* fast-forwarding and leaves `~/Library/Logs/dharma/.deploy.lock` behind (seen 21 Sep
2026). Then the timer stands down on the lock, and once the lock clears it sees "up to date"
and never rebuilds. If that happens: check nothing is running (`pgrep -f deploy.sh`),
`rmdir` the lock, and run the build steps by hand in a login shell. launchd already uses
`zsh -lc`, so scheduled runs are unaffected.

**Worktrees don't share installed packages.** A fresh `.claude/worktrees/…` copy has no
`node_modules`; run `npm ci` in it before `npm run build` or `npm test`.

Reaching the mini's loopback services from a laptop needs an SSH tunnel, e.g.
`ssh -N -L 8097:127.0.0.1:8097 -L 5432:127.0.0.1:5432 -L 8099:127.0.0.1:8099 mini`.
Be aware the tunnel has been observed to die right after a single successful long call —
`scripts/teacher-voice-test.ts` makes one bounded reconnect attempt per call if you set
`DHARMA_LLM_TUNNEL_CMD` to the command that reopens it. Running on the mini avoids all this.

### Testing before a release

1. On a laptop or the mini: `npm run lint`, `npm test`, `npm run build`.
2. Teacher wording changes only: `npm run teacher-voice-test` **on the mini** (it needs
   `dharma-llm` on 8099). Change one thing at a time and re-run. Test input is an invented
   practitioner (`scripts/teacher-voice-fixtures.ts`) — it never reads the real database.
   Output goes to the git-ignored `teacher-voice-output/`.
3. Confirm with Nicholas before pushing to the deploy branch — pushing *is* releasing (below).
