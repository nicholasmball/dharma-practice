---
paths:
  - "src/app/(app)/timer/**"
  - "src/app/(app)/journal/**"
  - "src/app/(app)/stats/**"
  - "src/app/api/reminders/**"
  - "src/components/ReminderChecker.tsx"
---

# Features: timer, journal, statistics, reminders (moved from CLAUDE.md)

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

### Reminders
- Browser notifications (Web Notifications API)
- Configurable times for meditation and journal
- Checked every minute when app is open

### Diary of teacher sessions (Nick only)
- A **Diary** tab (between Journal and Stats) listing sessions with Nick's teachers (Michael Taft,
  Vince Horn, Emily Horn) and the Friday Pragmatic Dharma teacher training, as a list and a month grid
- Counts sessions that have happened: this month / this year / all time, and per teacher (UK time)
- After each session: "Waiting for your write-up" for 14 days, on the Diary and as one line on Home.
  "Write it up" opens a pre-filled journal entry (`/journal/new?diary=<id>`); "Log a sit" opens the
  timer linked to the session (`/timer?diary=<id>`). "Didn't happen" and "No write-up needed" can be undone
- Shown only to emails in `DIARY_USER_EMAILS`; everyone else's app is unchanged
- **Split with Balla Bot:** Balla Bot reads the Google Calendar, decides which events are teacher
  sessions and sends every reminder (Telegram). The app has no calendar permission and sends no
  notifications for the diary. It asks Balla Bot's dharma service (`GET /sessions`, same address and
  token as the teacher) each time the Diary opens, waits at most 4 seconds, and keeps a saved copy so
  the Diary still works when Balla Bot can't be reached. Home only reads the saved copy
- Code: `src/lib/diary/`, `src/app/(app)/diary/`. Notes: `docs/notes/26bbbc17.md`
