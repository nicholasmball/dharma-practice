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
