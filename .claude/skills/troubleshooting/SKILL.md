---
name: troubleshooting
description: "Fixes for known problems: a missing column, the site being down, a push that did not go live, sign-in failing with redirect_uri_mismatch, the teacher not replying, environment variables not working, icons or the PWA not updating, a phone that cannot install the app, and check-constraint errors. Use whenever something is broken or an error message appears."
---

## Troubleshooting

### "Column doesn't exist" error, or a new column isn't visible
Usually PostgREST serving a stale schema cache rather than a missing column. Reload it:
`launchctl kickstart -k gui/$(id -u)/com.dharma.postgrest`. If the column really is
missing, apply the DDL by hand (see Database Changes).

### The site is down
1. `scripts/mini/install.sh --status` — launchd state, pid, last exit, branch and SHA, plus a health probe.
2. `curl http://127.0.0.1:8098/api/health` on the mini — expect `{"ok":true,...}`.
3. `tail -50 ~/Library/Logs/dharma/web.log`
4. Restart: `launchctl kickstart -k gui/$(id -u)/com.dharma.web`
5. If the app is fine on 8098 but not reachable from outside, the problem is the
   Cloudflare tunnel or Access, not the app.

### A push didn't go live
`tail -50 ~/Library/Logs/dharma/deploy.log`. `deploy.sh` stands down silently when:
the mini isn't on `main` (including detached HEAD), `git fetch` failed, the
working tree on the mini is dirty, or the merge wouldn't fast-forward. Fix the cause and
either wait 5 minutes or run `scripts/mini/deploy.sh` by hand.

### Sign-in fails / redirect_uri_mismatch
`AUTH_URL` must be `https://dharma.balla-bot.uk`, and the same URI must be registered in
the Google Cloud OAuth client. From a loopback origin Auth.js builds the callback from
`localhost:8098` and Google rejects it. Also check the email is in `AUTH_ALLOWED_EMAILS`
**and** has a row in `auth.users`.

### The teacher doesn't reply
Check `dharma-llm` is up on the mini (`127.0.0.1:8099`) and that `DHARMA_LLM_URL` and
`DHARMA_LLM_TOKEN` are set in `.env.local`. Replies stream via markers — see
`src/lib/teacher/stream-markers.ts`, which also notes corrupted replies observed right
after an SSH tunnel dropped and reopened.

### Environment variable not working
Config lives in `.env.local` in the repo root on the mini (chmod 600, never committed).
Edit it there, then `launchctl kickstart -k gui/$(id -u)/com.dharma.web`. A redeploy is
not required, but a restart is.

### Icon/favicon not updating
Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows). May also need to clear browser cache.

### PWA not updating / old version cached
1. Open DevTools → Application → Service Workers
2. Click "Unregister" on the service worker
3. Hard refresh the page

### Phone can't install the app / manifest and icons 302 instead of loading
The manifest, icons, service worker and screenshot files are deliberately let through
Cloudflare Access without sign-in by a separate, narrower Access application
("dharma install files (public)") with a Bypass policy — a phone has to fetch them
before anyone has signed in. The main "dharma" application still protects everything
else. Check it's still working with `scripts/mini/check-install-files.sh`.

### "Check constraint violated" error
A database constraint is blocking the value. Find and drop the constraint:
```sql
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```
