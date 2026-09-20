// Shared parser for the dharma-llm stream's zero-width-space-delimited
// markers. Extracted from src/app/(app)/teacher/page.tsx (where it lived as
// an inline closure) so it has one implementation instead of two — the
// teacher-voice test runner (scripts/teacher-voice-test.ts) used to have
// its own hand-rolled, one-shot copy of the same idea, which is exactly the
// kind of drift that made a real transport bug (see below) hard to tell
// apart from a parsing bug.
//
// Investigated 20 Sep 2026: during live testing, a couple of long calls
// produced replies with the raw marker text ("dharma:library:start...")
// visible in the saved answer, unstripped. Traced it to the transport, not
// this parser: `push`/`finalize` below never reset `buffer` between calls,
// and a partial marker (`close === -1` in `drain`) is only ever consumed
// once `finalize` is true or once what's been seen so far stops being a
// valid prefix of a known marker (`isMarkerPrefix`) — otherwise it waits
// for the next chunk. That means a marker split across two stream chunks
// is parsed correctly either way (see the "split across two chunks" test
// below, and the same case fed as one chunk for comparison — both produce
// identical output). The corrupted replies happened right after the SSH
// tunnel used for this task's testing had dropped and been reopened, which
// points at bytes genuinely missing from the HTTP body in transit — a
// connection problem, not something a smarter parser can recover from,
// since the U+200B bytes were never delivered at all. The app's own
// `fetch`/stream reads over its real network path (not a manually-forwarded
// SSH tunnel) were never observed to hit this.

export const ZWSP = '​'
export const LIBRARY_START = 'dharma:library:start'
export const LIBRARY_END = 'dharma:library:end'
export const STREAM_ERROR = 'dharma:error'
// Sent once as the final bytes of a successful answer (only when stream_markers is
// on). If a stream ends with neither this nor STREAM_ERROR, it was cut off.
export const STREAM_DONE = 'dharma:done'
export const STREAM_MARKERS = [LIBRARY_START, LIBRARY_END, STREAM_ERROR, STREAM_DONE] as const
export type StreamMarker = (typeof STREAM_MARKERS)[number]

function isKnownMarker(s: string): s is StreamMarker {
  return (STREAM_MARKERS as readonly string[]).includes(s)
}

export function isMarkerPrefix(s: string): boolean {
  return s.length > 0 && STREAM_MARKERS.some(m => m.startsWith(s))
}

export interface MarkerStreamParser {
  /** Feed the next chunk of raw stream text. May call onText/onMarker zero or more times. */
  push(chunk: string): void
  /** Call once the stream has ended, to flush anything still buffered. */
  finalize(): void
}

/**
 * Incremental parser for the dharma-llm stream: plain answer text with
 * occasional lone U+200B keepalives and U+200B-wrapped markers
 * (dharma:library:start/end, dharma:error, dharma:done). Emits answer text
 * as soon as it's known to be real (never a keepalive/marker), and holds
 * back only a suffix that could still turn into one — including across
 * separate `push()` calls, so a marker split across two stream chunks is
 * still recognised correctly.
 */
export function createMarkerStreamParser(handlers: {
  onText: (text: string) => void
  onMarker: (marker: StreamMarker) => void
}): MarkerStreamParser {
  let buffer = ''

  function drain(finalize: boolean) {
    for (;;) {
      const zi = buffer.indexOf(ZWSP)
      if (zi === -1) {
        handlers.onText(buffer)
        buffer = ''
        return
      }
      if (zi > 0) {
        handlers.onText(buffer.slice(0, zi))
        buffer = buffer.slice(zi)
      }
      // buffer now starts with a U+200B; find its closing U+200B.
      const close = buffer.indexOf(ZWSP, 1)
      if (close === -1) {
        const rest = buffer.slice(1)
        if (rest === '' || isMarkerPrefix(rest)) {
          // Could still become a keepalive or a marker — wait for more,
          // UNLESS this is the last chunk, in which case resolve now.
          if (finalize) {
            if (isKnownMarker(rest)) handlers.onMarker(rest)
            buffer = ''
          }
          return
        }
        // The leading U+200B was a standalone keepalive; drop it, keep going.
        buffer = rest
        continue
      }
      const token = buffer.slice(1, close)
      if (token === '') {
        // Two U+200B in a row: the first was a keepalive.
        buffer = buffer.slice(1)
      } else if (isKnownMarker(token)) {
        handlers.onMarker(token)
        buffer = buffer.slice(close + 1)
      } else {
        // A U+200B not opening a known marker: treat it as a keepalive.
        buffer = buffer.slice(1)
      }
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk
      drain(false)
    },
    finalize() {
      drain(true)
    },
  }
}

/** Strip any U+200B characters from already-saved text (e.g. an older
 * conversation turn saved before markers were stripped at save time). */
export const stripZwsp = (s: string) => s.split(ZWSP).join('')

/**
 * One-shot convenience for callers that already have the whole response
 * body as a single string (e.g. a non-streaming HTTP client, or the
 * teacher-voice test runner) rather than a stream of chunks. Equivalent to
 * push(raw) + finalize() on a fresh parser.
 */
export function parseMarkerStream(raw: string): { text: string; markers: StreamMarker[] } {
  let text = ''
  const markers: StreamMarker[] = []
  const parser = createMarkerStreamParser({
    onText: t => { text += t },
    onMarker: m => { markers.push(m) },
  })
  parser.push(raw)
  parser.finalize()
  return { text, markers }
}
