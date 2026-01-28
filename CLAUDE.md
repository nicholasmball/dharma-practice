# Dharma Practice - Project Documentation

A Buddhist meditation practice app built with Next.js, Supabase, and Claude AI.

**Live at:** https://buddha-balla.com

## About the Developer

**Nicholas Ball** - Not a professional developer (last coded ~20 years ago). Building this app for personal use and to share with others interested in meditation practice.

**When helping Nicholas:**
- Handle all setup and implementation
- Explain every step clearly in plain English
- Provide exact commands to run and specify where to run them
- He's on Windows
- He prefers to test locally before committing/pushing
- He understands concepts well when explained, but don't assume prior knowledge of modern dev tooling

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Inline styles (for reliability)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Email:** Resend (SMTP)
- **AI:** Anthropic Claude API
- **PWA:** next-pwa (offline support, installable)
- **Hosting:** Vercel
- **Domain:** Namecheap

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── login/
│   │   ├── signup/          # Shows email confirmation message
│   │   ├── forgot-password/ # Request password reset email
│   │   ├── reset-password/  # Set new password (from email link)
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
│   │   └── chat/route.ts    # Claude API endpoint
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
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server Supabase client
│   └── types.ts             # TypeScript types
└── middleware.ts            # Auth middleware (route protection)
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
- Email/password signup with confirmation email
- Login with "Forgot password?" link
- **Password reset flow**: Request email → click link → set new password
- Supabase Auth handles tokens and sessions

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
- Claude-powered chat (model configurable via `CLAUDE_MODEL` env var, defaults to Sonnet)
- Mahamudra/Dzogchen expertise
- Access to user's practice history for personalized guidance
- System prompt in `/api/chat/route.ts`
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

### Android App (Google Play Store)
- PWA wrapped using PWABuilder (https://pwabuilder.com)
- **Digital Asset Links** at `/.well-known/assetlinks.json` - links website to Android app
- **Package ID:** com.anthropic.pwa.xxx (set during PWABuilder export)

**Generated files (keep backups!):**
- `Buddha-Balla.aab` - Upload to Play Store
- `Buddha-Balla.apk` - For direct testing
- `signing.keystore` - **CRITICAL: Required for all future app updates**
- `signing-key-info.txt` - Keystore password

**Play Store requirements completed:**
- Privacy policy at `/privacy`
- Delete account functionality in Settings
- App screenshots in `/public/screenshots/`
- Feature graphic (1024x500) created via `/public/feature-graphic.html`

**Play Store status:**
- Developer account created (requires identity verification: 1-3 days)
- Closed testing track configured
- Waiting for identity approval before first release

### Mobile Responsive
- **Navigation**: Bottom bar on mobile, sidebar on desktop
- **Layout**: Responsive padding and spacing via Tailwind `md:` breakpoints
- **Teacher page**: Slide-out conversation drawer with hamburger menu on mobile
- Mobile detection via `window.innerWidth < 768`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-opus-4-20250514  # Optional, defaults to claude-sonnet-4-20250514
```

**Available Claude models:**
- `claude-opus-4-20250514` - Most capable, higher cost
- `claude-sonnet-4-20250514` - Balanced (default)
- `claude-haiku-3-5-20241022` - Fastest, lowest cost

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
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
```

## Deployment

Deployed on Vercel at buddha-balla.com. Push to `main` branch triggers automatic deployment.

```bash
git add .
git commit -m "Description of changes"
git push
```

### Services Configuration

**Vercel:**
- Environment variables set in dashboard
- Custom domain: buddha-balla.com

**Supabase:**
- Auth redirect URLs include buddha-balla.com
- Custom SMTP via Resend for emails

**Resend:**
- SMTP for transactional emails (signup confirmation, password reset)
- Domain: buddha-balla.com verified

**Namecheap:**
- Domain registrar for buddha-balla.com
- DNS records point to Vercel + Resend

## Costs

- **Vercel:** Free tier (100GB bandwidth)
- **Supabase:** Free tier (500MB database, 50k MAU)
- **Resend:** Free tier (100 emails/day)
- **Claude API:** Pay-per-use (~$3-15/month typical)
- **Domain:** ~$12/year
- **Google Play:** $25 one-time developer fee
