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

## Contents

The long reference sections have moved into notes under `.claude/rules/` (they open when you read the files they describe) and topic guides under `.claude/skills/` (they open when the subject comes up). The list is at the end of this file.

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
- **Domain:** `dharma.balla-bot.uk` (Cloudflare-managed). *(old `buddha-balla.com`: website switched off, but the domain is **still registered at Namecheap and still used to send email** — see below)*

## Project Structure

`src/app/` (`(auth)` sign-in pages, `(app)` protected pages: dashboard, timer, journal, stats, teacher, settings; `api/` auth, chat, feedback, health, reminders; `privacy`), `src/components/`, `src/lib/` (`auth/`, `postgrest/`, `teacher/`, `types.ts`), `src/middleware.ts`, `scripts/` (`mini/` ops scripts, teacher-voice test harness), `public/` (PWA icons, screenshots, manifest, `.well-known/`). Full tree: `.claude/rules/reference.md`.

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

### Laptop and releases (the essentials)

A laptop cannot run this app on its own: data, sign-in and the teacher need services that listen only on the Mac mini, so test on the mini. **Confirm with Nicholas before pushing to the deploy branch: pushing *is* releasing.** The detail (the four mini-side services, reaching the mini over SSH, the release checklist) is in `.claude/rules/development.md`.

## Where the moved notes are

Moved word for word; Claude Code opens them by itself. If you can't see them (another tool, or before you have opened the matching files), read the file.

- Contents list and full project tree: `.claude/rules/reference.md`
- Database schema and schema changes: `.claude/rules/database.md`
- Features: `.claude/rules/features-practice.md`, `features-teacher.md`, `features-account.md`, `features-mobile.md`
- Running on a laptop, testing before a release: `.claude/rules/development.md`
- Deploying, undoing a release, the mini's services, backups, costs: `.claude/skills/deploy-and-ops/SKILL.md`
- Something is broken: `.claude/skills/troubleshooting/SKILL.md`
