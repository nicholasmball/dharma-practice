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

  it('approved (shipped) and fix-notes-turn (the tested candidate it was promoted from) build identical output, turn by turn', () => {
    // Guards against silent drift between src/lib/teacher/prompt.ts (what
    // the route ships) and the fix-notes-turn variant this was tested as
    // (docs/teacher-voice-approved-wording.md, "Changes after testing").
    const approved = getVariant('approved')
    const fixNotesTurn = getVariant('fix-notes-turn')
    const background = {
      sessions: [{ practice_type: 'shamatha', duration_seconds: 600, started_at: '2026-09-18T08:00:00Z' }],
      entries: [],
    }
    expect(approved.buildFullSystem(background, false)).toBe(fixNotesTurn.buildFullSystem(background, false))
    expect(approved.buildFullSystem(background, true)).toBe(fixNotesTurn.buildFullSystem(background, true))
  })

  it('approved-v1 is frozen and distinct from approved (the shipped, post-fix wording)', () => {
    const approved = getVariant('approved')
    const approvedV1 = getVariant('approved-v1')
    expect(approvedV1.buildFullSystem(noData)).not.toBe(approved.buildFullSystem(noData))
  })
})
