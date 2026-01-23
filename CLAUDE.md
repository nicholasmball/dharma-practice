# Dharma Practice - Project Documentation

A Buddhist meditation practice app built with Next.js, Supabase, and Claude AI.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Inline styles (for reliability)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Public auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── actions.ts       # Auth server actions
│   ├── (app)/               # Protected app pages
│   │   ├── dashboard/
│   │   ├── timer/           # Meditation timer
│   │   ├── journal/         # Practice journal
│   │   ├── stats/           # Statistics dashboard
│   │   ├── teacher/         # AI chat
│   │   ├── settings/        # User settings
│   │   └── layout.tsx       # App layout with nav
│   ├── api/
│   │   └── chat/route.ts    # Claude API endpoint
│   ├── globals.css          # Global styles & CSS variables
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── Navigation.tsx       # Sidebar navigation
│   └── ReminderChecker.tsx  # Background reminder checker
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
- `practice_type` (text: shamatha, vipashyana, mahamudra, dzogchen, other)
- `completed` (boolean)
- `notes` (text, optional)
- `created_at` (timestamp)

### journal_entries
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text, optional)
- `content` (text)
- `tags` (text array)
- `practice_type` (text, optional)
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
- `created_at` (timestamp)
- `updated_at` (timestamp)

All tables have Row Level Security (RLS) enabled - users can only access their own data.

## Key Features

### Meditation Timer
- Duration presets (10, 20, 30, 45, 60 min) + custom
- Practice type selection
- Interval bells (optional)
- Start/pause/resume/end controls
- Singing bowl sound (Web Audio API)
- Auto-save on completion

### Practice Journal
- Rich text entries
- Tags (custom + suggested)
- Practice type association
- Search and filter
- Edit and delete

### Statistics Dashboard
- Time summaries (today/week/month/all-time)
- Current and longest streaks
- 30-day bar chart
- Practice type breakdown

### AI Meditation Teacher
- Claude-powered chat
- Mahamudra/Dzogchen expertise
- Access to user's practice history for personalized guidance
- System prompt in `/api/chat/route.ts`

### Reminders
- Browser notifications (Web Notifications API)
- Configurable times for meditation and journal
- Checked every minute when app is open

### Data Export
- Download all data as JSON
- Includes sessions, journal entries, settings

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Design System

CSS variables defined in `globals.css`:
- `--background`: Dark blue-grey (#1a1f2e)
- `--foreground`: Light grey (#e0e4eb)
- `--accent`: Muted gold (#c9a84c)
- `--surface`: Card background (#232938)
- `--border`: Border color (#3a4358)
- `--muted`: Secondary text (#8b92a5)
- `--error`: Error red (#e05555)
- `--success`: Success green (#55b085)

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
```

## Deployment

Deployed on Vercel. Push to `main` branch triggers automatic deployment.

Remember to:
1. Set environment variables in Vercel dashboard
2. Add Vercel URL to Supabase Auth redirect URLs

## Costs

- **Vercel:** Free tier (100GB bandwidth)
- **Supabase:** Free tier (500MB database, 50k MAU)
- **Claude API:** Pay-per-use (~$3-15/month typical)
