---
paths:
  - "src/app/(app)/teacher/**"
  - "src/lib/teacher/**"
  - "src/app/api/chat/**"
  - "scripts/teacher-voice-*"
---

# Features: the AI meditation teacher (moved from CLAUDE.md)

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
