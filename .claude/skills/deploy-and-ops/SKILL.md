---
name: deploy-and-ops
description: "Deploying and releasing the app, undoing a release, the services on the Mac mini, services configuration, backups and restores, and running costs. Use whenever deploy, release, push to the deploy branch, rollback, undo, launchd, the mini, backup, restore or cost comes up."
---

## Deployment

Self-hosted on the Mac mini. **There is no Vercel.**

- **Deploy branch: `main`.** (Until 21 Sep 2026 it was `mini-migration`; that branch is
  retired — don't push to it.)
- **Pushing to that branch releases within ~5 minutes.** The launchd job
  `com.dharma.updatecheck` runs `scripts/mini/deploy.sh` every 300s.

```bash
git push origin main   # this is the release
```

`scripts/mini/deploy.sh` then:

1. Takes a lock (`~/Library/Logs/dharma/.deploy.lock`; stale locks reclaimed after 30 min).
2. Stands down unless the mini is checked out on `main`.
3. `git fetch origin main`; stands down if nothing moved.
4. **Aborts if the mini's working tree is dirty** — it never resets or cleans.
5. `git merge --ff-only` — aborts on divergence, never forces.
6. `npm ci`
7. `npm run build`
8. `launchctl kickstart -k gui/$(id -u)/com.dharma.web`
9. Polls `http://127.0.0.1:8098/api/health` every 5s (up to 300s); fails if never healthy.

Run it by hand on the mini with `scripts/mini/deploy.sh`, or `DRY_RUN=1 scripts/mini/deploy.sh`
to see what it would do.

### How to undo a release

**Code — revert and push. Do not check out an old commit on the mini:** that leaves it in
a detached HEAD, and `deploy.sh` stands down when it isn't on the deploy branch, so the
mini silently stops auto-updating.

```bash
git revert <bad-sha>          # or: git revert --no-commit <bad-sha>..HEAD
git push origin main
```

The 5-minute timer picks it up, rebuilds and restarts. To apply it immediately, run
`scripts/mini/deploy.sh` on the mini.

**Database** — `scripts/mini/restore.sh <public_dump.sql> <auth_users.csv>`. Note it is
written for the Supabase-shaped export, **not** the nightly `pg_dump -Fc` files; restoring
one of those is a `pg_restore`. It drops and recreates the `public`, `auth` and
`extensions` schemas in `dharma`, and never touches the `favourites` database.

**Services** — `scripts/mini/uninstall.sh` boots out all four `com.dharma.*` jobs and
removes their plists. It leaves the repo, `.env.local` and logs alone. `DRY_RUN=1` supported.

### The services on the mini

| launchd label | What it does | Schedule |
|---|---|---|
| `com.dharma.web` | Next.js, `npm run start -- -H 127.0.0.1 -p 8098`. KeepAlive on | Always |
| `com.dharma.updatecheck` | Runs `deploy.sh` | Every 300s |
| `com.dharma.healthcheck` | Runs `healthcheck.sh` | Every 600s |
| `com.dharma.dbbackup` | Runs `backup-db.sh` | Daily 03:40 |
| `com.dharma.postgrest` | PostgREST on 8097 (owned outside this repo) | Always |

The `com.dharma.*` prefix is deliberate, so other projects' deploy scripts can't clobber
these jobs.

- Install / update the plists: `scripts/mini/install.sh` (copies `com.dharma.web` and
  `com.dharma.updatecheck` and **prints** the bootstrap commands rather than running them;
  the dbbackup and healthcheck plists must be copied and bootstrapped by hand — see the
  commands in their own plist headers).
- Status at a glance: `scripts/mini/install.sh --status`
- One-off health check: `scripts/mini/healthcheck.sh`
- Restart the app: `launchctl kickstart -k gui/$(id -u)/com.dharma.web`

**Ports:** web 8098 · PostgREST 8097 · Postgres 5432 · `dharma-llm` 8099.
`/api/health` is unauthenticated and returns `{ok:true, ts}` — it is what launchd and the
Cloudflare tunnel probe.

**Logs:** `~/Library/Logs/dharma/` — `web.log`, `deploy.log`, `healthcheck.log`,
`backup-db.log`, `dbbackup.launchd.log`, `healthcheck.launchd.log`.

### Services Configuration

**Cloudflare:** tunnel + Access in front of `dharma.balla-bot.uk`; invite-only via Google
sign-in plus the `AUTH_ALLOWED_EMAILS` allowlist. Cloudflare is also the DNS registrar.

**Google Cloud (OAuth):** the client ID/secret behind Google sign-in. The authorised
redirect URI must match `AUTH_URL` (`https://dharma.balla-bot.uk`).

**Resend:** SMTP for transactional email; still sends from `buddha-balla.com`. The feedback
form's sender (`feedback@buddha-balla.com`) is hard-coded in `src/app/api/feedback/route.ts`.
**Do not let `buddha-balla.com` lapse or remove its DNS records until email has moved to
another verified domain** — Resend only sends from a verified domain, so feedback email would
silently stop.

**Anthropic:** the teacher reaches Claude via Balla Bot's `dharma-llm` service
(`LLM_PROVIDER=ballabot`). `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` remains as a
fallback path in the code.

*Retired: Vercel, Supabase, and the `buddha-balla.com` website (Mini move 11). The
`buddha-balla.com` domain itself is still registered at Namecheap because email sends from it.*

## Backups

**Critical files (losing these = cannot update Android app):**
- `signing.keystore` — stored securely outside the repo (Google Drive)
- `signing-key-info.txt` — stored securely outside the repo (Google Drive)

**Database — backed up nightly, automatically.** `scripts/mini/backup-db.sh` runs at 03:40
(`com.dharma.dbbackup`), 10 minutes after the Favourites backup so the NAS isn't contended.

- Destination: `/Volumes/Public/dharma-backups` on the NAS (`DHARMA_BACKUP_DIR`). The
  script verifies the share is actually mounted first — otherwise backups land silently on
  local disk.
- `pg_dump -Fc -d dharma` to a temp file, sanity-checked (size, and `pg_restore -l` listing
  at least 4 tables) before being moved into place as `dharma-YYYY-MM-DD.dump`.
- Sundays also write `globals-YYYY-MM-DD.sql` (`pg_dumpall --globals-only`).
- Keeps the newest 30 dumps and 5 globals.
- Failures raise a Telegram alert (`DHARMA_NOTIFY=0` disables). Log: `~/Library/Logs/dharma/backup-db.log`.
- Prove it works without writing to the NAS: `scripts/mini/backup-db.sh --dry-run`.
- Restore: see "How to undo a release" above.

`scripts/mini/healthcheck.sh` (every 600s) also alerts if the newest dump is older than 26
hours — which is how an unmounted NAS gets noticed.

**Important but recoverable:**
- `.env.local` on the mini — not in git, and not fully recoverable from any dashboard.
  Worth keeping a copy somewhere safe.

**Backed up automatically:**
- Source code — Git + GitHub
- Database — nightly to the NAS, as above

## Costs

- **Mac mini hosting:** electricity only (self-hosted)
- **Cloudflare:** free tier (tunnel + Access)
- **Resend:** Free tier (100 emails/day)
- **Claude API:** Pay-per-use (~$3-15/month typical), billed via the key Balla Bot's `dharma-llm` uses
- **Domain:** `balla-bot.uk`, ~$12/year
- **Google Play:** $25 one-time developer fee

*No longer paying for / using: Vercel, Supabase. Still paying Namecheap for `buddha-balla.com`
(~£10/yr) while email sends from it.*
