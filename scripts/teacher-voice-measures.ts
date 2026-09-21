// Automatic ("count") measures from the teacher-voice scorecard
// (docs/teacher-voice-requirements.md, section 3). These are the ones that
// don't need a person reading the reply: length, whether it closes with a
// question, formatting, named sources, and banned phrases about being a
// program. All pure functions of the reply text, so a saved reply can
// always be re-measured later without another model call
// (see --remeasure in teacher-voice-test.ts).

export interface ReplyMeasures {
  wordCount: number
  endsWithQuestionInLastParagraph: boolean
  hasMarkdownHeaders: boolean
  hasBulletsOrBoldSubheads: boolean
  bannedPhraseHits: string[]
  namesASource: boolean
  hasQuotationMarks: boolean
}

// Phrases that would break character (scorecard measure 13) or narrate the
// machinery behind the conversation. Union of this task's original list and
// balla-bot's own BANNED_PHRASES (tests/test_dharma_llm_library_matrix.py,
// read read-only) so the two checks agree. Checked case-insensitively as
// substrings.
//
// Saying it is an AI is NOT banned (owner decision, 20 Sep 2026): asked
// sincerely, the teacher answers honestly in one sentence. What is banned is
// the machinery/vendor talk that was the real complaint ("built on Claude") —
// hence 'claude' and 'anthropic', matching balla-bot commit 2ad1d4b.
const BANNED_PHRASES = [
  'claude',
  'anthropic',
  'as a language model',
  'language model',
  'large language model',
  'let me check',
  'let me look that up',
  'let me search',
  'let me look',
  "i'll search",
  "i'll check the library",
  'one moment while i look',
  'as an assistant',
  "i'm just a program",
  'i am a program',
  'mcp__',
  'working directory',
  'file system',
  'the tool ',
  'using a tool',
]

// A modest, non-exhaustive list of teachers/books the buddhist-wiki library
// is known to cite, copied from balla-bot's
// tests/test_dharma_llm_library_matrix.py (KNOWN_TEACHERS_AND_BOOKS, read
// read-only) so "did the reply name a real source" is checked the same way
// on both sides.
const KNOWN_TEACHERS_AND_BOOKS = [
  'culadasa', 'the mind illuminated',
  'ñāṇavīra thera', 'clearing the path',
  'rob burbea', 'seeing that frees',
  'loch kelly', 'rupert spira', 'anam thubten', 'the magic of awareness',
  'stephan bodian', 'beyond mindfulness',
  'thich nhat hanh', 'joseph goldstein', 'jack kornfield',
  'sharon salzberg', 'bhikkhu bodhi', 'thanissaro bhikkhu',
  'daniel ingram', 'mastering the core teachings', 'in this very life',
  'mingyur rinpoche', 'tsoknyi rinpoche', 'ajahn chah', 'ajahn sumedho',
  'pema chödrön', 'thubten chodron', 'shinzen young',
  'leigh brasington', 'right concentration', 'kenneth folk',
]

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** True if the last non-empty paragraph contains a question mark. */
export function endsWithQuestionInLastParagraph(text: string): boolean {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return false
  return paragraphs[paragraphs.length - 1].includes('?')
}

/** Markdown ATX headers (#, ##, ...) anywhere in the reply. */
export function hasMarkdownHeaders(text: string): boolean {
  return /^#{1,6}\s+\S/m.test(text)
}

/** Bullet lists, numbered lists, or bold sub-headings (**Like this:**). */
export function hasBulletsOrBoldSubheads(text: string): boolean {
  const hasBullets = /^\s*[-*]\s+\S/m.test(text)
  const hasNumberedList = /^\s*\d+\.\s+\S/m.test(text)
  const hasBoldSubhead = /^\s*\*\*[^*]+\*\*\s*$/m.test(text) || /^\s*\*\*[^*]+:\*\*/m.test(text)
  return hasBullets || hasNumberedList || hasBoldSubhead
}

export function bannedPhraseHits(text: string): string[] {
  const lower = text.toLowerCase()
  return BANNED_PHRASES.filter(phrase => lower.includes(phrase))
}

/** Does the reply name a real, known teacher or book? (see KNOWN_TEACHERS_AND_BOOKS) */
export function namesASource(text: string): boolean {
  const lower = text.toLowerCase()
  return KNOWN_TEACHERS_AND_BOOKS.some(name => lower.includes(name))
}

/** Does the reply put anything in quotation marks (straight or curly)? A rough
 * proxy for "this looks like a direct quote" — used to flag replies worth a
 * human double-check against the actual book. */
export function hasQuotationMarks(text: string): boolean {
  return /"[^"]{3,}"|“[^”]{3,}”/.test(text)
}

/**
 * Fix 2's automatic measure: a reply that names a real teacher/book AND
 * puts something in quotation marks AND did not actually consult the
 * bookshelf (no lookup call) for THIS reply. That combination means a
 * saying was pinned on someone without checking it — the exact failure
 * mode found in the `where_am_i_followup` conversation (turn 2 attributed
 * quoted words to Tsoknyi Rinpoche with zero lookups). `consulted` is
 * per-reply state the test runner already tracks (lookupCount > 0), passed
 * in rather than recomputed here.
 */
export function quotedAttributionWithoutLookup(measures: ReplyMeasures, consulted: boolean): boolean {
  return measures.namesASource && measures.hasQuotationMarks && !consulted
}

// Phrases/patterns that indicate a reply is recalling the practitioner's
// sent-every-turn background (sessions/journal) rather than just answering
// what's in front of it — dates, "you wrote", explicit session recaps. A
// rough keyword measure (per the task: sanity-check by reading replies,
// this over/under-counts at the margins) for the notes-mention rate found
// in the six-turn check-in conversation.
const NOTES_MENTION_PATTERNS: RegExp[] = [
  /\bthe \d{1,2}(st|nd|rd|th)\b/i, // "the 14th", "the 17th"
  /\byou wrote\b/i,
  /\byou logged\b/i,
  /\byour (journal|notes|entry|entries)\b/i,
  /\byour (last|recent) (sit|session)\b/i,
  /\bwhat you wrote\b/i,
  /\byour practice log\b/i,
]

/** Does this reply mention the practitioner's sent background (dates, "you wrote", session recaps)? */
export function mentionsNotes(text: string): boolean {
  return NOTES_MENTION_PATTERNS.some(re => re.test(text))
}

export function measureReply(text: string): ReplyMeasures {
  return {
    wordCount: countWords(text),
    endsWithQuestionInLastParagraph: endsWithQuestionInLastParagraph(text),
    hasMarkdownHeaders: hasMarkdownHeaders(text),
    hasBulletsOrBoldSubheads: hasBulletsOrBoldSubheads(text),
    bannedPhraseHits: bannedPhraseHits(text),
    namesASource: namesASource(text),
    hasQuotationMarks: hasQuotationMarks(text),
  }
}
