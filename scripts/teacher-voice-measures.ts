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
  houseStyle: HouseStyleMeasures
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

// ---- House-style measures ("it still has a Claude feel", 21 Sep 2026) -----
//
// The owner judged a live Deep follow-up reply as sounding like the model's
// default voice rather than the old teacher. Compared against the old
// teacher's 50 archived replies, that reply was far outside the old range on
// four habits, counted below. Old-teacher averages per reply with these exact
// counters, for reference (computed once from the private archive, which is
// never read here): punchy fragments 1.06, signposts 0.14, concede-and-praise
// 0.12, importance stamps ("the one that matters", flagged by the owner) 0.00,
// "not X, it's Y" contrasts 0.52, "Ah" opening 48%, closing question about
// experience 64%. Rough keyword measures — read the replies too.

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Clipped one-to-three-word statements used for punch ("Vivid." "Fine."). Questions and list items don't count. */
export function punchyFragmentCount(text: string): number {
  return sentences(text).filter(s => /[.!]$/.test(s) && !/^\s*(\d+\.|[-*])\s/.test(s) && countWords(s) <= 3).length
}

const SIGNPOST_PATTERNS: RegExp[] = [
  /\bworth (noticing|seeing|saying|pausing on|sitting with)\b/gi,
  /\bhere's the (thing|point|key)\b/gi,
  /\bthat's the whole\b/gi,
  /\bthe key (is|here)\b/gi,
  /\bwhat I'd (have you|like you to) (notice|see|do)\b/gi,
  /(^|\n|\.\s)(So|Now|Here|Which is to say):(?=\s)/g,
  /(^|\n)So (—|-|tell me\b)/g, // "So — when you rest…", "So tell me…"  /(^|\n|\.\s)Now, /g,
  /\bthe real question\b/gi,
  /\bwhich is (exactly|precisely) (why|the point)\b/gi,
  /\blet me be (clear|precise|direct)\b/gi,
]

/** Lecture-style signposting ("worth seeing why", "Now, what I'd have you notice", "So:"). */
export function signpostCount(text: string): number {
  return SIGNPOST_PATTERNS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0)
}

const CONCEDE_PATTERNS: RegExp[] = [
  /\b(quite|you're|you are|absolutely|exactly) right\b/gi,
  /\bfair (point|correction)\b/gi,
  /\bI('ll| will) take (the|that) correction\b/gi,
  /\bI stand corrected\b/gi,
  /\bmore (cleanly|clearly|precisely|accurately) than I (did|had|put it)\b/gi,
  /\bbetter than I (did|had|put it)\b/gi,
  /\bthank you for (the|that) correction\b/gi,
  /\bthank(s| you) for (correcting|setting) me\b/gi,
  /\bmore (precise|accurate|exact) than (what )?I\b/gi,
  /\b(a )?better (report|way of putting it|description) than\b/gi,
  // Softer comparisons that survived the fix-voice wording (21 Sep 2026):
  // "a finer description than mine", "more interesting finding than the one I
  // was answering", "that's the more accurate description".
  /\b(finer|clearer|better|truer|sharper|more \w+) (description|finding|way of (putting|saying) it|report|distinction|account) than (mine|the one I|what I)\b/gi,
  /\bthat's the more (accurate|precise|exact) (description|way|account)\b/gi,
  /\bworth keeping exactly as you('ve| have) put it\b/gi,
  /\bI (misspoke|put that badly|was sloppy)\b/gi,
]

/** Conceding to, and praising, a practitioner's correction ("Quite right… more cleanly than I did"). */
export function concedeAndPraiseCount(text: string): number {
  return CONCEDE_PATTERNS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0)
}

const CONTRAST_PATTERNS: RegExp[] = [
  /,\s*not\s+\w+/gi, // "empty of self, not empty of appearance"
  /\bnot\b[^.?!]{1,40}(—|;|,)\s*(but|it's|it is)\b/gi, // "not a thing — it's a process"
  /\b(isn't|aren't|wasn't|doesn't|don't)\b[^.?!]{1,40}[.—]\s*(It's|It is|It was|They're)\b/g, // "It isn't X. It's Y."
]

const IMPORTANCE_STAMP_PATTERNS: RegExp[] = [
  /\b(the|that's the|it's the) one that (matters|counts)\b/gi,
  /\bthat's (what|all that) (matters|counts)\b/gi,
  /\bthat's the (real|whole|key|crucial|important) (find|thing|point|part|move|distinction|insight|question)\b/gi,
  /\bthe real (thing|find|work|point)\b/gi,
  /\bthat's the whole (thing|point|game|story|of it)\b/gi,
  /\b(this|that) is (the|exactly the) (heart|crux) of\b/gi,
  /\bthat matters\b/gi,
]

/**
 * Stamping a point as the important one ("and it's the one that matters",
 * "that's the real find") instead of letting it land — flagged by the owner
 * on 21 Sep 2026 as sounding "very Claude".
 */
export function importanceStampCount(text: string): number {
  return IMPORTANCE_STAMP_PATTERNS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0)
}

/** "Not X, it's Y" contrasts, a house-style tic when repeated. */
export function contrastCount(text: string): number {
  return CONTRAST_PATTERNS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0)
}

/** Does the reply open with "Ah" — the old teacher's most common warm opening (48% of replies)? */
export function opensWithAh(text: string): boolean {
  return /^\s*Ah\b/.test(text)
}

const EXPERIENCE_WORDS = /\b(feel|feels|felt|feeling|notice|noticed|noticing|find|found|sense|body|see|seeing|look|looking|experience|like for you|happens|happened|aware|awareness|breath|sit|sits)\b/i

/**
 * Does the closing question ask about their own felt, direct experience
 * (what they notice, find, feel) rather than pose an abstract puzzle? The
 * last question in the reply is taken as "the closing question".
 */
export function closingQuestionAboutExperience(text: string): boolean {
  const questions = sentences(text).filter(s => s.endsWith('?'))
  if (questions.length === 0) return false
  return EXPERIENCE_WORDS.test(questions[questions.length - 1])
}

// Distinctive words and pictures from the invented example exchanges in the
// fix-examples variant (src/lib/teacher/variants.ts). A hit means the teacher
// copied an example rather than learning its voice.
const EXAMPLE_ECHOES: RegExp[] = [
  /\bfifteen-minute droop\b/i,
  /\blamp\b[^.?!]{0,60}\b(oil|turned down)\b/i,
  /\boil and (a little more )?air\b/i,
  /\briverbank\b/i,
  /\bwatching the boats\b/i,
  /\bclimbed aboard\b/i,
  /\bwriting on (the surface of )?(a pond|water)\b/i,
  /\bcarving (the )?letters\b/i,
  /\bthread (were |was )?drawing the crown\b/i,
  /^\s*Oh, I see\b/i,
  /^\s*Mm, a lovely question\b/i,
]

/** Which of the example exchanges' distinctive words or pictures turn up in this reply. */
export function exampleEchoes(text: string): string[] {
  return EXAMPLE_ECHOES.filter(re => re.test(text)).map(re => re.source)
}

export interface HouseStyleMeasures {
  exampleEchoes: string[]
  punchyFragments: number
  signposts: number
  concedeAndPraise: number
  importanceStamps: number
  contrasts: number
  opensWithAh: boolean
  closingQuestionAboutExperience: boolean
}

export function measureHouseStyle(text: string): HouseStyleMeasures {
  return {
    exampleEchoes: exampleEchoes(text),
    punchyFragments: punchyFragmentCount(text),
    signposts: signpostCount(text),
    concedeAndPraise: concedeAndPraiseCount(text),
    importanceStamps: importanceStampCount(text),
    contrasts: contrastCount(text),
    opensWithAh: opensWithAh(text),
    closingQuestionAboutExperience: closingQuestionAboutExperience(text),
  }
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
    houseStyle: measureHouseStyle(text),
  }
}
