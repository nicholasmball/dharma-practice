import { describe, expect, it } from 'vitest'
import { getVariant, TEACHER_VOICE_VARIANTS } from '../variants'

const noData = { sessions: [], entries: [] }

describe('getVariant', () => {
  it('returns each of the three known variants', () => {
    expect(getVariant('today').key).toBe('today')
    expect(getVariant('original').key).toBe('original')
    expect(getVariant('approved').key).toBe('approved')
  })

  it('throws a clear, listable error for an unknown variant', () => {
    expect(() => getVariant('nonsense')).toThrowError(/Unknown teacher-voice variant "nonsense"/)
    expect(() => getVariant('nonsense')).toThrowError(/today/)
    expect(() => getVariant('nonsense')).toThrowError(/original/)
    expect(() => getVariant('nonsense')).toThrowError(/approved/)
  })

  it('each variant builds a non-empty system string that changes with the background', () => {
    for (const key of Object.keys(TEACHER_VOICE_VARIANTS)) {
      const variant = getVariant(key)
      const empty = variant.buildFullSystem(noData)
      const withData = variant.buildFullSystem({
        sessions: [{ practice_type: 'shamatha', duration_seconds: 600, started_at: '2026-09-18T08:00:00Z' }],
        entries: [],
      })
      expect(empty.length).toBeGreaterThan(0)
      expect(withData).not.toBe(empty)
    }
  })

  it('approved (shipped) and fix-ai-answer (the latest tested candidate) build identical output, turn by turn', () => {
    // Guards against silent drift between src/lib/teacher/prompt.ts (what
    // the route ships) and the variant it was promoted from
    // (docs/teacher-voice-approved-wording.md). The pairing moves forward
    // each time a fix is promoted — it was fix-notes-turn before fix 4.
    const approved = getVariant('approved')
    const fixAiAnswer = getVariant('fix-ai-answer')
    const background = {
      sessions: [{ practice_type: 'shamatha', duration_seconds: 600, started_at: '2026-09-18T08:00:00Z' }],
      entries: [],
    }
    expect(approved.buildFullSystem(background, false)).toBe(fixAiAnswer.buildFullSystem(background, false))
    expect(approved.buildFullSystem(background, true)).toBe(fixAiAnswer.buildFullSystem(background, true))
  })

  it('fix-ai-answer differs from fix-notes-turn only in the "am I talking to an AI?" sentence', () => {
    // Fix 4 is meant to be a one-sentence change layered on fix-notes-turn,
    // so a regression can be traced to it and nothing else.
    const before = getVariant('fix-notes-turn').systemPromptOnly
    const after = getVariant('fix-ai-answer').systemPromptOnly
    expect(after).not.toBe(before)
    expect(before).toContain('answer honestly in a sentence and carry on as their teacher')
    expect(after).not.toContain('answer honestly in a sentence and carry on as their teacher')
    expect(after).toContain('in one sentence and not a word more')
    // Everything either side of that one sentence is untouched.
    const marker = 'If someone sincerely asks whether they are talking with an AI,'
    expect(before.slice(0, before.indexOf(marker))).toBe(after.slice(0, after.indexOf(marker)))
    const tail = 'Write the way you speak:'
    expect(before.slice(before.indexOf(tail))).toBe(after.slice(after.indexOf(tail)))
  })

  it('approved-v1 is frozen and distinct from approved (the shipped, post-fix wording)', () => {
    const approved = getVariant('approved')
    const approvedV1 = getVariant('approved-v1')
    expect(approvedV1.buildFullSystem(noData)).not.toBe(approved.buildFullSystem(noData))
  })
})
