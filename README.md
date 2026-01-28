# Dharma Practice

A meditation practice companion app for Buddhist practitioners, featuring a meditation timer, practice journal, statistics tracking, and an AI meditation teacher.

**Live at:** [buddha-balla.com](https://buddha-balla.com)

## Features

### Meditation Timer
- Duration presets (10, 20, 30, 45, 60 minutes) or custom duration
- Practice type selection (Shamatha, Vipashyana, Mahamudra, Dzogchen, or custom types)
- Optional interval bells during sessions
- Singing bowl sounds at start and end
- Screen stays awake during meditation
- Session notes that auto-create journal entries

### Practice Journal
- Write reflections on your practice
- Tag entries for easy organization
- Associate entries with practice types
- Search and filter by text, tags, or practice type

### Statistics Dashboard
- Track your meditation streaks
- View practice time summaries (daily, weekly, monthly, all-time)
- See practice type breakdown
- 30-day activity chart

### AI Meditation Teacher
- Chat with a Claude-powered meditation teacher
- Expertise in Mahamudra and Dzogchen traditions
- Personalized guidance based on your practice history
- Conversation history saved for continuity

### Additional Features
- Custom practice types - add your own meditation styles
- Dark and light themes
- Daily meditation and journal reminders
- Data export (JSON)
- Works offline (PWA)
- Installable on mobile and desktop

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Anthropic API key

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/nicholasmball/dharma-practice.git
   cd dharma-practice
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional
   ```

4. Set up the database tables in Supabase (see `CLAUDE.md` for schema details)

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## License

This project is for personal use. Feel free to fork and adapt for your own practice.

## Author

**Nicholas Ball** - Built for personal use and to share with others interested in meditation practice.
