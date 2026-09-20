import { describe, expect, it } from 'vitest'
import {
  buildBackgroundBlock,
  buildLegacyBackgroundBlock,
  assembleSystemPrompt,
  isFollowUpTurn,
  TEACHER_SYSTEM_PROMPT,
  TEACHER_BACKGROUND_INTRO,
  type PractitionerBackground,
  type BackgroundIntroText,
} from '../prompt'

const withData: PractitionerBackground = {
  sessions: [
    { practice_type: 'shamatha', duration_seconds: 1200, started_at: '2026-09-18T08:00:00Z', notes: 'Settled quickly today.' },
    { practice_type: 'vipashyana', duration_seconds: 900, started_at: '2026-09-15T08:00:00Z' },
  ],
  entries: [
    { title: 'A quiet morning', content: 'The mind was unusually still.', practice_type: 'shamatha', created_at: '2026-09-18T08:30:00Z' },
    { title: null, content: 'Restless today, kept returning to the breath.', created_at: '2026-09-14T08:30:00Z' },
  ],
}

const noData: PractitionerBackground = { sessions: [], entries: [] }

describe('buildBackgroundBlock', () => {
  it('includes a recent-practice summary and full journal entries when data is present', () => {
    const block = buildBackgroundBlock(withData, TEACHER_BACKGROUND_INTRO)

    expect(block).toContain(TEACHER_BACKGROUND_INTRO.firstTurn)
    expect(block).toContain('Recent practice: 2 sessions totaling 35 minutes.')
    expect(block).toContain('Notes from last session: "Settled quickly today."')
    expect(block).toContain('Journal entries (most recent first, shown in full):')
    expect(block).toContain('The mind was unusually still.')
    expect(block).toContain('Restless today, kept returning to the breath.')
    expect(block).toContain('Untitled')
    expect(block.endsWith('[END CONTEXT]\n')).toBe(true)
  })

  it('falls back to a beginner message when there are no sessions or entries', () => {
    const block = buildBackgroundBlock(noData, TEACHER_BACKGROUND_INTRO)

    expect(block).toContain('just beginning their journey')
    expect(block).not.toContain('Recent practice:')
    expect(block).not.toContain('Journal entries')
  })

  it('uses whichever intro text is passed in, so different wording variants share the same data formatting', () => {
    const block = buildBackgroundBlock(withData, 'A different intro entirely.')
    expect(block).toContain('A different intro entirely.')
    expect(block).toContain('Recent practice: 2 sessions totaling 35 minutes.')
  })

  const twoPartIntro: BackgroundIntroText = {
    firstTurn: 'This is the first-turn intro.',
    followUp: 'This is the quieter follow-up intro.',
  }

  it('uses the first-turn intro by default when given a BackgroundIntroText', () => {
    const block = buildBackgroundBlock(withData, twoPartIntro)
    expect(block).toContain('This is the first-turn intro.')
    expect(block).not.toContain('This is the quieter follow-up intro.')
  })

  it('uses the first-turn intro when isFollowUp is explicitly false', () => {
    const block = buildBackgroundBlock(withData, twoPartIntro, false)
    expect(block).toContain('This is the first-turn intro.')
  })

  it('uses the follow-up intro when isFollowUp is true', () => {
    const block = buildBackgroundBlock(withData, twoPartIntro, true)
    expect(block).toContain('This is the quieter follow-up intro.')
    expect(block).not.toContain('This is the first-turn intro.')
  })

  it('still formats the same session/journal data regardless of which intro is selected', () => {
    const block = buildBackgroundBlock(withData, twoPartIntro, true)
    expect(block).toContain('Recent practice: 2 sessions totaling 35 minutes.')
    expect(block).toContain('Journal entries (most recent first, shown in full):')
  })

  it('a plain-string intro is unaffected by isFollowUp (historical variants that send the same wording every turn keep working)', () => {
    const plain = 'A single, same-every-turn intro.'
    const first = buildBackgroundBlock(withData, plain, false)
    const followUp = buildBackgroundBlock(withData, plain, true)
    expect(first).toBe(followUp)
  })

  it('the shipped TEACHER_BACKGROUND_INTRO genuinely differs between the first turn and a follow-up turn', () => {
    const first = buildBackgroundBlock(withData, TEACHER_BACKGROUND_INTRO, false)
    const followUp = buildBackgroundBlock(withData, TEACHER_BACKGROUND_INTRO, true)
    expect(first).not.toBe(followUp)
    expect(first).toContain(TEACHER_BACKGROUND_INTRO.firstTurn)
    expect(followUp).toContain(TEACHER_BACKGROUND_INTRO.followUp)
  })
})

describe('isFollowUpTurn', () => {
  it('is false for the first message of a conversation (no assistant reply yet)', () => {
    expect(isFollowUpTurn([{ role: 'user' }])).toBe(false)
  })

  it('is true once the conversation has at least one assistant reply', () => {
    expect(isFollowUpTurn([{ role: 'user' }, { role: 'assistant' }, { role: 'user' }])).toBe(true)
  })

  it('is false for an empty message list', () => {
    expect(isFollowUpTurn([])).toBe(false)
  })
})

describe('buildLegacyBackgroundBlock', () => {
  it('reproduces the old app format: bracket header, truncated entries, no full text', () => {
    const longEntry: PractitionerBackground = {
      sessions: withData.sessions,
      entries: [{ title: 'Long one', content: 'x'.repeat(400), created_at: '2026-09-18T08:30:00Z' }],
    }
    const block = buildLegacyBackgroundBlock(longEntry)

    expect(block).toContain('[PRACTITIONER CONTEXT]')
    expect(block).toContain('Recent journal entries:')
    expect(block).toContain('...')
    expect(block).not.toContain('x'.repeat(400))
  })

  it('falls back to the old beginner message with no data', () => {
    const block = buildLegacyBackgroundBlock(noData)
    expect(block).toContain('[PRACTITIONER CONTEXT]')
    expect(block).toContain('just beginning their journey')
  })
})

describe('assembleSystemPrompt', () => {
  it('appends the background block after the system prompt when background is present', () => {
    const block = buildBackgroundBlock(withData, TEACHER_BACKGROUND_INTRO)
    const full = assembleSystemPrompt(TEACHER_SYSTEM_PROMPT, block)

    expect(full.startsWith(TEACHER_SYSTEM_PROMPT)).toBe(true)
    expect(full).toContain('Recent practice:')
  })

  it('is just the system prompt when there is no background block', () => {
    const full = assembleSystemPrompt(TEACHER_SYSTEM_PROMPT, '')
    expect(full).toBe(TEACHER_SYSTEM_PROMPT)
  })
})
