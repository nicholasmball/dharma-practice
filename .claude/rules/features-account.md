---
paths:
  - "src/app/(auth)/**"
  - "src/lib/auth/**"
  - "src/app/(app)/settings/**"
  - "src/app/(app)/dashboard/**"
  - "src/app/privacy/**"
  - "src/app/page.tsx"
  - "src/components/ThemeProvider.tsx"
  - "src/components/Navigation.tsx"
  - "src/middleware.ts"
---

# Features: sign-in, onboarding, settings, privacy, themes (moved from CLAUDE.md)

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

### Mobile Responsive
- **Navigation**: Bottom bar on mobile, sidebar on desktop
- **Layout**: Responsive padding and spacing via Tailwind `md:` breakpoints
- **Teacher page**: Slide-out conversation drawer with hamburger menu on mobile
- Mobile detection via `window.innerWidth < 768`
