# balladharma - Project Documentation

A Buddhist meditation practice app built with Next.js, self-hosted on a Mac mini.

**Live at:** https://dharma.balla-bot.uk (invite-only; Google sign-in, behind Cloudflare Access)

> **Migration note (Sep 2026):** The app was migrated off Vercel + Supabase onto a self-hosted
> Mac mini. It now runs as a launchd service (`com.dharma.web`, Next.js on 127.0.0.1:8098) behind a
> Cloudflare tunnel + Access at `dharma.balla-bot.uk`, backed by local **Postgres 17 + PostgREST**,
> with **Auth.js (Google sign-in)** replacing Supabase Auth. The old `buddha-balla.com` on Vercel and
> the Supabase project were decommissioned in Mini move 11. Nightly DB backups go to the NAS.
> The AI teacher now routes through **Balla Bot's `dharma-llm` service** (Mini move 13, commit
> 6066972); the direct Anthropic path survives only as a fallback behind `LLM_PROVIDER=anthropic`.
> Historical Supabase/Vercel details below are kept for reference only.

## Table of Contents
- [About the Developer](#about-the-developer)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Key Features](#key-features)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Development](#development)
- [Deployment](#deployment)
- [Database Changes](#database-changes)
- [Troubleshooting](#troubleshooting)
- [Backups](#backups)
- [Costs](#costs)

## About the Developer

**Nicholas Ball** - Not a professional developer (last coded ~20 years ago). Building this app for personal use and to share with others interested in meditation practice.

**When helping Nicholas:**
- Handle all setup and implementation
- Explain every step clearly in plain English
- Provide exact commands to run and specify where to run them
- He works from a Mac laptop; the app itself runs on the Mac mini
- **IMPORTANT: Never release without Nicholas confirming the change first.** Note that
  pushing to `main` IS the release — the mini picks it up within ~5 minutes. And
  a laptop cannot run this app alone (see Development), so "test it locally first" no longer
  means what it used to: testing that touches data, sign-in or the teacher has to happen on
  the mini. Agree with him how a change will be checked before you push it.
- **A change isn't live until it's on `main` on GitHub.** Sessions often run in a
  `.claude/worktrees/…` copy on their own branch — a commit there reaches nobody until it's
  pushed to `main`. When he says "get it live", that means `git push origin main` (after the
  checks in Development), then confirm the mini picked it up (Deployment).
- He understands concepts well when explained, but don't assume prior knowledge of modern dev tooling

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Inline styles (for reliability)
- **Database:** Self-hosted PostgreSQL 17 on the Mac mini (loopback), data API via **PostgREST** (127.0.0.1:8097). *(was: Supabase)*
- **Authentication:** **Auth.js (NextAuth) with Google sign-in**, app-minted PostgREST JWTs, invite-only email allowlist. *(was: Supabase Auth)*
- **Email:** Resend (SMTP) — still sends from `buddha-balla.com`
- **AI:** Claude, reached via Balla Bot's local `dharma-llm` service (`LLM_PROVIDER=ballabot`); direct Anthropic API kept as a fallback
- **PWA:** next-pwa (offline support, installable)
- **Hosting:** **Mac mini** — Next.js via launchd (`com.dharma.web`), served through a **Cloudflare tunnel + Access**. *(was: Vercel)*
- **Domain:** `dharma.balla-bot.uk` (Cloudflare-managed). *(old `buddha-balla.com` was on Namecheap → Vercel, now retired)*

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── login/           # Google sign-in
│   │   ├── signup/          # Historical — email/password retired in the mini migration
│   │   ├── forgot-password/ # Historical
│   │   ├── reset-password/  # Historical
│   │   └── actions.ts       # Auth server actions
│   ├── (app)/               # Protected app pages
│   │   ├── dashboard/
│   │   ├── timer/           # Meditation timer
│   │   │   ├── page.tsx     # Server component (loads user settings)
│   │   │   ├── TimerClient.tsx  # Client component (timer UI)
│   │   │   └── actions.ts   # Save session + auto-create journal
│   │   ├── journal/         # Practice journal
│   │   ├── stats/           # Statistics dashboard
│   │   ├── teacher/         # AI chat with conversation history
│   │   │   ├── page.tsx     # Chat UI with sidebar
│   │   │   └── actions.ts   # Conversation CRUD operations
│   │   ├── settings/        # User settings
│   │   └── layout.tsx       # App layout with nav
│   ├── api/
│   │   ├── auth/            # Auth.js (Google sign-in) handler
│   │   ├── chat/route.ts    # Teacher chat endpoint (streams; Balla Bot or direct Anthropic)
│   │   ├── feedback/        # Settings feedback form → email via Resend
│   │   ├── health/          # Unauthenticated {ok, ts} probe for launchd + Cloudflare
│   │   └── reminders/
│   ├── privacy/            # Privacy policy page
│   ├── globals.css          # Global styles & CSS variables
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── Navigation.tsx       # Sidebar navigation
│   ├── OfflineIndicator.tsx # Shows "You're offline" when disconnected
│   ├── ReminderChecker.tsx  # Background reminder checker
│   └── ThemeProvider.tsx    # Dark/light theme context
├── lib/
│   ├── auth/                # Auth.js helpers: allowlist, sign-in, PostgREST token, delete-user
│   ├── postgrest/           # PostgREST client (mints a short-lived per-request JWT)
│   ├── teacher/             # Teacher prompt, wording variants, stream markers (+ tests)
│   ├── site-url.ts          # Public base URL
│   └── types.ts             # TypeScript types
└── middleware.ts            # Auth middleware (route protection)

scripts/
├── mini/                    # Mac mini ops: deploy, install, backup, restore, healthcheck, launchd plists
└── teacher-voice-*.ts       # Teacher wording test harness (npm run teacher-voice-test)

public/
├── icons/                   # PWA icons (192x192, 512x512)
├── screenshots/             # App screenshots for Play Store & PWA
├── .well-known/
│   └── assetlinks.json      # Digital Asset Links (Android app verification)
├── manifest.json            # PWA manifest
└── feature-graphic.html     # Play Store feature graphic generator
```

## Database Schema

### meditation_sessions
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `started_at` (timestamp)
- `ended_at` (timestamp)
- `duration_seconds` (integer)
- `practice_type` (text) - Built-in types: shamatha, vipashyana, mahamudra, dzogchen, other. Also accepts custom types.
- `completed` (boolean)
- `notes` (text, optional)
- `created_at` (timestamp)

### journal_entries
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text, optional)
- `content` (text)
- `tags` (text array)
- `practice_type` (text, optional) - Accepts built-in or custom types
- `created_at` (timestamp)
- `updated_at` (timestamp)

### user_settings
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users, unique)
- `meditation_reminder_enabled` (boolean)
- `meditation_reminder_time` (time)
- `journal_reminder_enabled` (boolean)
- `journal_reminder_time` (time)
- `default_session_duration` (integer, seconds)
- `default_practice_type` (text)
- `custom_practice_types` (jsonb) - Array of {name, description?} objects for custom practice types
- `bell_sound` (text) - Timer bell choice
- `teacher_model` (text, nullable) - Teacher depth chosen in Settings; must be in `TEACHER_MODEL_ALLOWLIST`
- `created_at` (timestamp)
- `updated_at` (timestamp)

### teacher_conversations
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text) - First message truncated to 50 chars
- `messages` (jsonb) - Array of {role, content} objects
- `created_at` (timestamp)
- `updated_at` (timestamp)

All tables have Row Level Security (RLS) enabled - users can only access their own data.

## Key Features

### Authentication
- **Google sign-in only** — email/password signup and password reset were retired in the
  mini migration. The `(auth)/signup`, `forgot-password` and `reset-password` routes are
  historical.
- **Invite-only**: the email must be in `AUTH_ALLOWED_EMAILS` *and* have a row in `auth.users`.
- Auth.js (NextAuth) handles the session; the app mints a short-lived PostgREST JWT per
  request (user UUID as `sub`, `role: authenticated`) so row-level security applies.
- Cloudflare Access sits in front of the whole site as a second gate.

### Landing Page
- Hero with "Start Your Practice" CTA
- Feature cards (Timer, Journal, AI Teacher, Stats)
- "Free to use. No ads." messaging

### New User Onboarding
- Shows on dashboard until 3 steps complete:
  1. Complete first meditation
  2. Write first journal entry
  3. Ask the teacher a question
- Checkmarks for completed steps
- Dynamic CTA button for next action

### Meditation Timer
- Duration presets (10, 20, 30, 45, 60 min) + custom
- Practice type selection with descriptions (collapsible)
- **Custom practice types** - Users can add their own types (e.g., Jhana, Tonglen) in Settings
- Interval bells (optional, with explanation)
- Start/pause/resume/end controls
- **5-second preparation countdown** before session starts
- Singing bowl sound at start and end (Web Audio API)
- **Screen wake lock** - prevents screen from sleeping during meditation
- Auto-save on completion
- **Loads user's default duration and practice type from settings**
- **Session notes auto-create a journal entry** with title format: "Shamatha - Jan 24, 2026 - 20 min"

### Practice Journal
- Rich text entries
- Tags (custom + suggested)
- Practice type association (including custom types)
- Search and filter (by text, tags, or practice type)
- Edit and delete
- Auto-created entries from session notes tagged with "session notes"

### Statistics Dashboard
- **Time since last sit** - Prominent card with color coding (green=recent, amber=2+ days, red=7+ days)
- Time summaries (today/week/month/all-time)
- Current and longest streaks
- 30-day bar chart
- Practice type breakdown

### AI Meditation Teacher
- Claude-powered chat, streamed. Each user picks the depth in Settings (Balanced / Deep —
  see Teacher models). `CLAUDE_MODEL` only matters on the direct-Anthropic fallback path.
- Mahamudra/Dzogchen expertise
- Access to user's practice history for personalized guidance
- Prompt and wording in `src/lib/teacher/` (`prompt.ts`, `variants.ts`); endpoint in `src/app/api/chat/route.ts`
- **Question box grows as you type** (up to ~200px, ~120px on mobile, then scrolls).
  Enter sends; Shift+Enter adds a new line.
- **Personalized suggested questions** based on practice profile:
  - New practitioner (< 5 sessions): Fundamentals
  - Returning after break (> 7 days): Re-engagement
  - Active streak (7+ days): Progress/deepening
  - Practice-type specific (shamatha, vipashyana, dzogchen, mahamudra)
- **Conversation history** - Save, continue, and delete past conversations
- Collapsible sidebar showing all conversations
- **Search** - Find conversations by title or message content
- Auto-saves conversations after each message

### Reminders
- Browser notifications (Web Notifications API)
- Configurable times for meditation and journal
- Checked every minute when app is open

### Data Export
- Download all data as JSON
- Includes sessions, journal entries, settings

### Account Deletion
- Delete account button in Settings
- Requires typing "DELETE" to confirm
- Removes all user data (sessions, entries, conversations, settings)
- Signs user out after deletion

### Privacy Policy
- Available at `/privacy`
- Covers data collection, storage, sharing, and user rights
- Required for Google Play Store compliance

### Dark/Light Mode
- Toggle in Settings > Appearance
- Theme persisted in localStorage
- Anti-flash script prevents wrong theme on load
- CSS variables switch via `[data-theme="light"]` selector

### PWA (Progressive Web App)
- **Installable** - Add to home screen on mobile/desktop
- **Offline support** - Cached assets, timer works offline
- **Offline indicator** - Shows banner when disconnected
- Manifest at `/public/manifest.json`
- Icons at `/public/icons/` (192x192, 512x512)
- Screenshots at `/public/screenshots/` (6 app screens)
- Service worker generated by next-pwa (production only)
- Build uses webpack (`next build --webpack`) for PWA compatibility

### App Icon
- Custom enso (Zen brush circle) design
- Gold gradient stroke on dark background (#1a1f2e)
- Small dot in center representing awareness
- Source SVG at `src/app/icon.svg`
- PNG versions generated for PWA at `public/icons/`

### Android App (Google Play Store)
- PWA wrapped using PWABuilder (https://pwabuilder.com)
- **Package ID:** `com.buddha_balla.twa`
- **Play Console:** https://play.google.com/console/ (search for Buddha Balla)
- **Digital Asset Links** at `/.well-known/assetlinks.json` - links website to Android app

**Play Store status:**
- Closed testing release published
- **TODO: Recruit 12 testers** — post on r/betatesting, r/androidapps, r/Buddhism, r/meditation. Enable "Anyone with the link" in Play Console → Testing → Closed testing → Testers, then share the opt-in URL.
- 14-day testing period required after 12 testers opt in
- Then can apply for production access

**Generated files (keep backups!):**
- `Buddha-Balla.aab` - Upload to Play Store
- `Buddha-Balla.apk` - For direct testing
- `signing.keystore` - **CRITICAL: Required for all future app updates** — stored securely outside the repo (Google Drive)
- `signing-key-info.txt` - Keystore password — stored securely outside the repo (Google Drive)

**Play Store requirements completed:**
- Privacy policy at `/privacy`
- Delete account functionality in Settings
- App screenshots in `/public/screenshots/`
- Feature graphic (1024x500) created via `/public/feature-graphic.html`

### Mobile Responsive
- **Navigation**: Bottom bar on mobile, sidebar on desktop
- **Layout**: Responsive padding and spacing via Tailwind `md:` breakpoints
- **Teacher page**: Slide-out conversation drawer with hamburger menu on mobile
- Mobile detection via `window.innerWidth < 768`

## Environment Variables

Config lives in `.env.local` in the repo root **on the mini** (chmod 600, never committed).
`.env.example` is the authoritative, commented list — check it rather than this summary.

```
# Which LLM path the teacher uses
LLM_PROVIDER=ballabot                    # or "anthropic" for the direct fallback

# Balla Bot dharma-llm service (loopback on the mini)
DHARMA_LLM_URL=http://127.0.0.1:8099
DHARMA_LLM_TOKEN=...

# Direct Anthropic fallback (only when LLM_PROVIDER=anthropic)
ANTHROPIC_API_KEY=...

# Data
POSTGREST_URL=http://127.0.0.1:8097      # all app data
POSTGREST_JWT_SECRET=...                 # signs the per-request JWT
DATABASE_URL=postgres://dharma_owner:...@127.0.0.1:5432/dharma   # auth.users only

# Auth.js / Google sign-in
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_ALLOWED_EMAILS=a@example.com,b@example.com
AUTH_URL=https://dharma.balla-bot.uk     # must be the public host, not loopback

# Email
RESEND_API_KEY=...
```

After editing `.env.local`, restart the app — a redeploy is not needed:
`launchctl kickstart -k gui/$(id -u)/com.dharma.web`

**Teacher models.** The two depths offered in Settings, per `TEACHER_MODEL_ALLOWLIST` in
`src/app/api/chat/route.ts`:

| Setting | Model |
|---|---|
| Balanced | `claude-sonnet-5` |
| Deep | `claude-opus-5` |

## Design System

CSS variables defined in `globals.css` (dark theme default, light theme via `[data-theme="light"]`):

| Variable | Dark Theme | Light Theme |
|----------|------------|-------------|
| `--background` | #1a1f2e | #f5f5f0 |
| `--foreground` | #e0e4eb | #1a1f2e |
| `--accent` | #c9a84c | #b8941f |
| `--surface` | #232938 | #ffffff |
| `--border` | #3a4358 | #d4d4cf |
| `--muted` | #8b92a5 | #6b7280 |
| `--error` | #e05555 | #dc2626 |
| `--success` | #55b085 | #16a34a |

## Development

```bash
npm run dev                  # Dev server (Turbopack) on http://localhost:3000
npm run build                # Production build (next build --webpack — webpack is required for the PWA service worker)
npm run start                # Production server
npm run lint                 # ESLint
npm test                     # Unit tests (Vitest, single run)
npm run test:watch           # Unit tests, watch mode
npm run teacher-voice-test   # Ask the real teacher a fixed set of invented questions and score the replies
```

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
the mini can be done over SSH from a laptop session, e.g.
`ssh mini 'cd ~/projects/dharma-practice && scripts/mini/install.sh --status'`.

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

**Resend:** SMTP for transactional email; still sends from `buddha-balla.com`.

**Anthropic:** the teacher reaches Claude via Balla Bot's `dharma-llm` service
(`LLM_PROVIDER=ballabot`). `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` remains as a
fallback path in the code.

*Retired: Vercel, Supabase, Namecheap, and the `buddha-balla.com` domain (Mini move 11).*

## Database Changes

Postgres 17 runs on the mini (loopback, database `dharma`, port 5432), with PostgREST on
8097 in front of it. Local `trust` auth, so the scripts connect without a password.

Row-level security uses an `auth.uid()` shim that reads `request.jwt.claims -> sub`. The
app mints a short-lived HS256 token per request with the user's UUID as `sub` and
`role: authenticated`, signed with `POSTGREST_JWT_SECRET`.

> **There is no migrations workflow in this repo** — no migrations folder, no SQL files in
> git. Schema changes are applied by hand. This is a known gap; a migrations folder would
> be an improvement.

To change the schema, **on the mini**:

1. `psql -d dharma` and run your DDL.
2. Reload PostgREST's schema cache, or it will keep serving the old shape:
   `launchctl kickstart -k gui/$(id -u)/com.dharma.postgrest`
3. Update the Database Schema section of this file.
4. Update `src/lib/types.ts` if you added or changed fields.
5. Take a fresh backup: `scripts/mini/backup-db.sh`

**Common operations:**
```sql
-- Add a column
ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value;

-- Remove a constraint
ALTER TABLE table_name DROP CONSTRAINT constraint_name;

-- Check existing constraints
SELECT * FROM information_schema.table_constraints WHERE table_name = 'your_table';
```

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

### "Check constraint violated" error
A database constraint is blocking the value. Find and drop the constraint:
```sql
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```

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

*No longer paying for / using: Vercel, Supabase, Namecheap.*
