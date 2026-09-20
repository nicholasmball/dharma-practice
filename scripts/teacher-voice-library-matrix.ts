// The "book use" turns for the teacher-voice test runner. Copied as DATA
// (verbatim wording, read read-only, nothing executed or imported from that
// repo) from balla-bot's own lookup-frequency check:
//   /Users/nickball/projects/balla-bot/tests/test_dharma_llm_library_matrix.py
// (EVERYDAY_TURNS, LOOKUP_TURNS incl. QUOTE_FOLLOWUP_LOOKUP_TURN,
// JUDGEMENT_TURNS). Reusing the exact same turns means this app's teacher
// is being held to the same bar balla-bot already tests the raw service
// against. The owner has since decided the JUDGEMENT_TURNS SHOULD consult
// the books (docs/teacher-voice-approved-wording.md — "turn to it ... when
// the question is about the teachings themselves").

export interface LibraryMatrixTurn {
  id: string
  group: 'everyday' | 'lookup' | 'judgement'
  /** A single user message, or a short prior conversation ending in the turn to send. */
  messages: { role: 'user' | 'assistant'; content: string }[]
  label: string
}

const EVERYDAY_TURNS: string[] = [
  'I only managed five minutes today, is that still worth it?',
  'My legs kept falling asleep during sitting practice, any tips?',
  'I feel really restless today, what should I do?',
  "Good morning, I'm about to start my session.",
  'I missed my practice yesterday, should I feel bad about that?',
  "What's a good length for a lunchtime meditation?",
  'I keep getting distracted by noise outside, how do I handle that?',
  'Can you just guide me through a short body scan?',
  'I had a really peaceful sit this morning, thank you.',
  "What's the best way to end a walking meditation session?",
]

const QUOTE_FOLLOWUP_LOOKUP_TURN: { role: 'user' | 'assistant'; content: string }[] = [
  { role: 'user', content: 'What is the nature of no-self?' },
  {
    role: 'assistant',
    content:
      "No-self isn't that you disappear -- it's that when you actually look for a " +
      'fixed, separate watcher behind your experience, you can\'t find one. Daniel ' +
      'Ingram writes about this a lot: he describes the sense of self as a habit of ' +
      'identification rather than a solid thing, and points out that whatever you can ' +
      "observe, by definition, isn't the one doing the observing.",
  },
  { role: 'user', content: 'Can you find the quote where Daniel talks about this? Or several quotes?' },
]

const LOOKUP_TURNS: (string | typeof QUOTE_FOLLOWUP_LOOKUP_TURN)[] = [
  'What does Rob Burbea say about the emptiness of awareness?',
  'Which of the books would you point me to on the jhanas, and what does it actually say?',
  'What does Culadasa say about the stages of samatha?',
  'Can you give me some sources on loving-kindness practice?',
  'What did Rob Burbea teach about emptiness?',
  'How does Ñāṇavīra Thera describe the sense of self?',
  'What do the teachers in the tradition say about the dark night?',
  'Give me a citation for the jhanas from the tradition.',
  QUOTE_FOLLOWUP_LOOKUP_TURN,
]

const JUDGEMENT_TURNS: string[] = [
  'Is awareness just the new self in better clothes?',
  'What is the nature of no-self?',
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)
}

export const LIBRARY_MATRIX_TURNS: LibraryMatrixTurn[] = [
  ...EVERYDAY_TURNS.map((prompt, i) => ({
    id: `everyday-${i + 1}-${slugify(prompt)}`,
    group: 'everyday' as const,
    messages: [{ role: 'user' as const, content: prompt }],
    label: prompt,
  })),
  ...LOOKUP_TURNS.map((turn, i) => {
    const messages = typeof turn === 'string' ? [{ role: 'user' as const, content: turn }] : turn
    const label = typeof turn === 'string' ? turn : messages[messages.length - 1].content
    return {
      id: `lookup-${i + 1}-${slugify(label)}`,
      group: 'lookup' as const,
      messages,
      label,
    }
  }),
  ...JUDGEMENT_TURNS.map((prompt, i) => ({
    id: `judgement-${i + 1}-${slugify(prompt)}`,
    group: 'judgement' as const,
    messages: [{ role: 'user' as const, content: prompt }],
    label: prompt,
  })),
]
