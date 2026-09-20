// Invented test data for the teacher-voice test runner.
//
// PRIVACY: this is entirely made up for testing. It is not the owner's real
// practice history, and the real database is never read by this script.
// The practitioner below is "an experienced practitioner of several years"
// as required by the task: a steady, mixed shamatha/dzogchen practice, a
// recent sit note, and three short journal entries.

import type { PractitionerBackground } from '../src/lib/teacher/prompt.ts'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const INVENTED_BACKGROUND: PractitionerBackground = {
  sessions: [
    { practice_type: 'shamatha', duration_seconds: 1800, started_at: daysAgo(0), notes: 'Settled faster than usual. A few minutes of real stillness near the end.' },
    { practice_type: 'dzogchen', duration_seconds: 1500, started_at: daysAgo(1) },
    { practice_type: 'shamatha', duration_seconds: 1200, started_at: daysAgo(2) },
    { practice_type: 'vipashyana', duration_seconds: 1800, started_at: daysAgo(3) },
    { practice_type: 'shamatha', duration_seconds: 1200, started_at: daysAgo(4) },
    { practice_type: 'dzogchen', duration_seconds: 1500, started_at: daysAgo(6) },
    { practice_type: 'shamatha', duration_seconds: 1200, started_at: daysAgo(7) },
    { practice_type: 'shamatha', duration_seconds: 1800, started_at: daysAgo(9) },
    { practice_type: 'vipashyana', duration_seconds: 1200, started_at: daysAgo(11) },
    { practice_type: 'shamatha', duration_seconds: 1200, started_at: daysAgo(13) },
  ],
  entries: [
    {
      title: 'Quieter than expected',
      content: 'Sat for thirty minutes this morning. The first ten were the usual chatter, but then things settled and I noticed the gaps between thoughts more clearly than I have in a while. Nothing dramatic, just steadier.',
      practice_type: 'shamatha',
      created_at: daysAgo(0),
    },
    {
      title: 'Working with a busy week',
      content: "Practice has felt more like maintenance than progress this week — work has been full on. Still sitting daily, just shorter. I notice I'm impatient with myself for that.",
      practice_type: 'dzogchen',
      created_at: daysAgo(3),
    },
    {
      title: 'A good pointing-out moment',
      content: 'During the evening sit, for a moment I just recognised the awareness that was already there, rather than trying to produce a calm state. Hard to describe. Gone almost as soon as I noticed it, but I want to remember that it happened.',
      practice_type: 'dzogchen',
      created_at: daysAgo(6),
    },
  ],
}
