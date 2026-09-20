import { describe, expect, it } from 'vitest'
import { createMarkerStreamParser, parseMarkerStream, ZWSP, LIBRARY_START, LIBRARY_END, STREAM_DONE } from '../stream-markers'

function run(chunks: string[]) {
  const text: string[] = []
  const markers: string[] = []
  const parser = createMarkerStreamParser({
    onText: t => text.push(t),
    onMarker: m => markers.push(m),
  })
  for (const c of chunks) parser.push(c)
  parser.finalize()
  return { text: text.join(''), markers }
}

describe('createMarkerStreamParser', () => {
  it('passes plain text straight through with no markers', () => {
    const { text, markers } = run(['Ah, that is a lovely question.'])
    expect(text).toBe('Ah, that is a lovely question.')
    expect(markers).toEqual([])
  })

  it('strips a marker delivered whole in a single chunk', () => {
    const raw = `before${ZWSP}${LIBRARY_START}${ZWSP}after`
    const { text, markers } = run([raw])
    expect(text).toBe('beforeafter')
    expect(markers).toEqual([LIBRARY_START])
  })

  it('strips a marker split across TWO separate chunks (the case this task asked about)', () => {
    // The opening ZWSP and part of the marker name arrive in chunk 1; the
    // rest of the name, the closing ZWSP, and trailing text arrive in
    // chunk 2. A naive parser that only looks within one chunk would leak
    // "dharma:library:start" as literal text — this one must not.
    const chunk1 = `before${ZWSP}dharma:libr`
    const chunk2 = `ary:start${ZWSP}after`
    const { text, markers } = run([chunk1, chunk2])
    expect(text).toBe('beforeafter')
    expect(markers).toEqual([LIBRARY_START])
  })

  it('gives the same result whether a marker is split across chunks or not', () => {
    const whole = run([`x${ZWSP}${LIBRARY_END}${ZWSP}y`])
    const split = run([`x${ZWSP}dharma:library:en`, `d${ZWSP}y`])
    expect(split.text).toBe(whole.text)
    expect(split.markers).toEqual(whole.markers)
  })

  it('splits a marker across three chunks, one character of the wrapper at a time', () => {
    const raw = `hi${ZWSP}${STREAM_DONE}${ZWSP}bye`
    const chunks = raw.split('') // every single character its own chunk
    const { text, markers } = run(chunks)
    expect(text).toBe('hibye')
    expect(markers).toEqual([STREAM_DONE])
  })

  it('treats a lone, unpaired U+200B as a keepalive and drops it', () => {
    const { text, markers } = run([`hello${ZWSP}world`])
    expect(text).toBe('helloworld')
    expect(markers).toEqual([])
  })

  it('treats a ZWSP-wrapped token that is not a known marker as a keepalive, keeping the text', () => {
    const { text, markers } = run([`a${ZWSP}not-a-marker${ZWSP}b`])
    expect(text).toBe('anot-a-markerb')
    expect(markers).toEqual([])
  })

  it('does not hang waiting forever on a trailing partial marker with no finalize', () => {
    // Regression check for the buffering logic itself: push() alone must not
    // emit the partial marker text as real content.
    const text: string[] = []
    const parser = createMarkerStreamParser({ onText: t => text.push(t), onMarker: () => {} })
    parser.push(`done${ZWSP}dharma:lib`)
    expect(text.join('')).toBe('done') // "dharma:lib" withheld, not leaked as text
  })
})

describe('parseMarkerStream (one-shot, whole-body convenience)', () => {
  it('matches the incremental parser on the same input', () => {
    const raw = `Ah — ${ZWSP}${LIBRARY_START}${ZWSP}here is my answer.${ZWSP}${STREAM_DONE}${ZWSP}`
    const { text, markers } = parseMarkerStream(raw)
    expect(text).toBe('Ah — here is my answer.')
    expect(markers).toEqual([LIBRARY_START, STREAM_DONE])
  })
})
