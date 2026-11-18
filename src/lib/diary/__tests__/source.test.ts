import { describe, expect, it, vi } from 'vitest'
import { fetchSourceSessions } from '../source'
import { michaelCoaching, vinceMentoring } from './fixtures'

const window = { from: '2037-09-19T00:00:00.000Z', to: '2038-11-18T00:00:00.000Z' }
const config = { url: 'http://127.0.0.1:8099/sessions', token: 'secret' }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('fetchSourceSessions', () => {
  it('asks Balla Bot with the token and the date window, and returns the sessions', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ generated_at: '2037-11-18T05:00:00Z', sessions: [michaelCoaching, vinceMentoring] })
    )
    const result = await fetchSourceSessions({ ...window, ...config, fetchImpl })

    expect(result).toEqual({ ok: true, sessions: [michaelCoaching, vinceMentoring] })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/sessions')
    expect(parsed.searchParams.get('from')).toBe(window.from)
    expect(parsed.searchParams.get('to')).toBe(window.to)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret')
  })

  it('maps an unknown kind to "other"', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ generated_at: 'x', sessions: [{ ...michaelCoaching, kind: 'retreat' }] })
    )
    const result = await fetchSourceSessions({ ...window, ...config, fetchImpl })
    expect(result.ok && result.sessions[0].kind).toBe('other')
  })

  it('skips bad rows but keeps the good ones', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        generated_at: 'x',
        sessions: [
          michaelCoaching,
          { ...vinceMentoring, id: '' },
          { ...vinceMentoring, starts_at: 'not a date' },
          { ...vinceMentoring, ends_at: '2037-12-01T10:00:00Z' }, // ends before it starts
          { ...vinceMentoring, status: 'tentative' },
          'nonsense',
        ],
      })
    )
    const result = await fetchSourceSessions({ ...window, ...config, fetchImpl })
    expect(result).toEqual({ ok: true, sessions: [michaelCoaching] })
  })

  it('rejects the whole reply when the top level is the wrong shape', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [] }))
    const result = await fetchSourceSessions({ ...window, ...config, fetchImpl })
    expect(result).toEqual({ ok: false, reason: 'bad_reply' })
  })

  it('reports a wrong token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'unauthorized' }, 401))
    expect(await fetchSourceSessions({ ...window, ...config, fetchImpl })).toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('reports that Balla Bot has no session list yet (404)', async () => {
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }))
    expect(await fetchSourceSessions({ ...window, ...config, fetchImpl })).toEqual({ ok: false, reason: 'not_available' })
  })

  it('reports a server error, including the calendar being unreadable (503)', async () => {
    for (const status of [500, 503]) {
      const fetchImpl = vi.fn(async () => new Response('boom', { status }))
      expect(await fetchSourceSessions({ ...window, ...config, fetchImpl })).toEqual({ ok: false, reason: 'error' })
    }
  })

  it('gives up after the timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        })
    )
    const result = await fetchSourceSessions({ ...window, ...config, fetchImpl, timeoutMs: 20 })
    expect(result).toEqual({ ok: false, reason: 'timeout' })
  })

  it('reports a network failure without throwing', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await fetchSourceSessions({ ...window, ...config, fetchImpl })).toEqual({ ok: false, reason: 'unreachable' })
  })

  it('reports that it is not set up when there is no address or token', async () => {
    const fetchImpl = vi.fn()
    expect(await fetchSourceSessions({ ...window, url: '', token: 'x', fetchImpl })).toEqual({ ok: false, reason: 'not_configured' })
    expect(await fetchSourceSessions({ ...window, url: 'http://x', token: '', fetchImpl })).toEqual({ ok: false, reason: 'not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
