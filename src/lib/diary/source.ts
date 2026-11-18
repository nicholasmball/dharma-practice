import { DIARY_KINDS, type DiaryKind, type SourceSession } from './types'

// Reads the session list from Balla Bot's dharma service (`GET /sessions`,
// same loopback service and bearer token as the teacher). Never throws: the
// Diary page must still load from its saved copy when Balla Bot is down.

export type SourceFailure = 'not_configured' | 'unauthorized' | 'not_available' | 'error' | 'timeout' | 'unreachable' | 'bad_reply'

export type SourceResult = { ok: true; sessions: SourceSession[] } | { ok: false; reason: SourceFailure }

export const SOURCE_TIMEOUT_MS = 4000

export function defaultSourceUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.BALLABOT_SESSIONS_URL) return env.BALLABOT_SESSIONS_URL
  if (env.DHARMA_LLM_URL) return `${env.DHARMA_LLM_URL.replace(/\/+$/, '')}/sessions`
  return ''
}

interface FetchOptions {
  from: string
  to: string
  url?: string
  token?: string
  timeoutMs?: number
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>
}

export async function fetchSourceSessions(options: FetchOptions): Promise<SourceResult> {
  const url = options.url ?? defaultSourceUrl()
  const token = options.token ?? process.env.DHARMA_LLM_TOKEN ?? ''
  const fetchImpl = options.fetchImpl ?? fetch
  if (!url || !token) return { ok: false, reason: 'not_configured' }

  const target = new URL(url)
  target.searchParams.set('from', options.from)
  target.searchParams.set('to', options.to)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SOURCE_TIMEOUT_MS)

  try {
    const response = await fetchImpl(target.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) return { ok: false, reason: 'unauthorized' }
    if (response.status === 404) return { ok: false, reason: 'not_available' }
    if (!response.ok) return { ok: false, reason: 'error' }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { ok: false, reason: 'bad_reply' }
    }
    const sessions = parseReply(body)
    return sessions ? { ok: true, sessions } : { ok: false, reason: 'bad_reply' }
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

/** Returns null when the top level is wrong; otherwise the rows that are valid. */
export function parseReply(body: unknown): SourceSession[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { sessions?: unknown }).sessions)) {
    return null
  }
  const rows = (body as { sessions: unknown[] }).sessions
  const sessions: SourceSession[] = []
  for (const raw of rows) {
    const parsed = parseRow(raw)
    if (parsed) sessions.push(parsed)
  }
  return sessions
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseRow(raw: unknown): SourceSession | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isText(r.id) || !isText(r.teacher) || !isText(r.starts_at) || !isText(r.ends_at)) return null
  const start = Date.parse(r.starts_at)
  const end = Date.parse(r.ends_at)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  if (r.status !== 'confirmed' && r.status !== 'cancelled') return null
  const kind: DiaryKind = DIARY_KINDS.includes(r.kind as DiaryKind) ? (r.kind as DiaryKind) : 'other'
  return {
    id: r.id,
    teacher: r.teacher,
    kind,
    title: isText(r.title) ? r.title : r.teacher,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status,
  }
}
