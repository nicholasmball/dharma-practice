---
paths:
  - "package.json"
  - "tsconfig.json"
  - "next.config.ts"
  - "src/types/**"
---

# Reference: contents list and full project tree (moved from CLAUDE.md)

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
