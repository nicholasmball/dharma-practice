import { describe, expect, it } from 'vitest'
import {
  measureReply,
  endsWithQuestionInLastParagraph,
  namesASource,
  hasQuotationMarks,
  bannedPhraseHits,
  quotedAttributionWithoutLookup,
  mentionsNotes,
} from '../teacher-voice-measures.ts'

describe('endsWithQuestionInLastParagraph', () => {
  it('is true when the final paragraph contains a question mark', () => {
    const text = 'Some warmth here.\n\nA picture here.\n\nWhat do you notice when you look?'
    expect(endsWithQuestionInLastParagraph(text)).toBe(true)
  })

  it('is false when the final paragraph has no question mark, even if an earlier one does', () => {
    const text = 'What do you notice?\n\nHere is something to try. No question here at all.'
    expect(endsWithQuestionInLastParagraph(text)).toBe(false)
  })

  it('is false for an empty reply', () => {
    expect(endsWithQuestionInLastParagraph('')).toBe(false)
  })

  it('is populated (not null/undefined) on the object returned by measureReply', () => {
    const measures = measureReply('One paragraph, no question.')
    expect(measures.endsWithQuestionInLastParagraph).toBeDefined()
    expect(measures.endsWithQuestionInLastParagraph).not.toBeNull()
    expect(typeof measures.endsWithQuestionInLastParagraph).toBe('boolean')
  })
})

describe('namesASource', () => {
  it('is true when a known teacher or book is named', () => {
    expect(namesASource('As Daniel Ingram writes in Mastering the Core Teachings...')).toBe(true)
  })
  it('is false for an everyday reply naming no one', () => {
    expect(namesASource('Try sitting for five more minutes tomorrow.')).toBe(false)
  })
})

describe('hasQuotationMarks', () => {
  it('detects a straight-quoted passage', () => {
    expect(hasQuotationMarks('He writes: "whatever you can observe is not the observer."')).toBe(true)
  })
  it('does not fire on a bare apostrophe', () => {
    expect(hasQuotationMarks("It's just the mind's own nature.")).toBe(false)
  })
})

describe('bannedPhraseHits', () => {
  it('catches machinery-narrating phrases', () => {
    expect(bannedPhraseHits('Let me check the library for that.')).toContain('let me check')
    expect(bannedPhraseHits('As a large language model I cannot know.')).toContain('large language model')
  })
  it('is empty for an ordinary teacherly reply', () => {
    expect(bannedPhraseHits('Ah, that is a lovely question. What do you notice?')).toEqual([])
  })
  it('allows the honest one-sentence answer to "am I talking to an AI?"', () => {
    expect(bannedPhraseHits("I'm an AI — you're right to ask straight out.")).toEqual([])
    expect(bannedPhraseHits('Yes, you are talking with an AI. I am an AI, not a person.')).toEqual([])
  })
  it('catches naming the vendor or model behind the teacher', () => {
    expect(bannedPhraseHits("You're talking to an AI — a Claude model.")).toContain('claude')
    expect(bannedPhraseHits('I was built by Anthropic.')).toContain('anthropic')
  })
})

describe('quotedAttributionWithoutLookup', () => {
  it('is true for the exact where_am_i_followup turn 2 failure: named teacher + quote + no lookup', () => {
    const text = 'Tsoknyi Rinpoche talks about rigpa becoming "the ground you keep returning to."'
    const measures = measureReply(text)
    expect(quotedAttributionWithoutLookup(measures, false)).toBe(true)
  })

  it('is false when the same reply DID consult the bookshelf', () => {
    const text = 'Tsoknyi Rinpoche talks about rigpa becoming "the ground you keep returning to."'
    const measures = measureReply(text)
    expect(quotedAttributionWithoutLookup(measures, true)).toBe(false)
  })

  it('is false when a source is named but nothing is quoted', () => {
    const measures = measureReply('This is close to what Tsoknyi Rinpoche teaches about resting in awareness.')
    expect(quotedAttributionWithoutLookup(measures, false)).toBe(false)
  })

  it('is false when something is quoted but no source is named', () => {
    const measures = measureReply('What do you notice when you look at "the one who is looking"?')
    expect(quotedAttributionWithoutLookup(measures, false)).toBe(false)
  })
})

describe('mentionsNotes', () => {
  it('detects a date reference like "the 14th"', () => {
    expect(mentionsNotes('The pointing-out moment on the 14th sounds real.')).toBe(true)
  })

  it('detects "you wrote"', () => {
    expect(mentionsNotes("That tracks with what you wrote on the 17th too.")).toBe(true)
  })

  it('detects "your journal"', () => {
    expect(mentionsNotes('It is good you noticed that in your journal.')).toBe(true)
  })

  it('is false for a reply that only answers the question in front of it', () => {
    expect(mentionsNotes('Try sitting for five more minutes tomorrow and notice what settles.')).toBe(false)
  })
})
