import type { PostgrestClient } from '@supabase/postgrest-js'
import { reconcile } from './reconcile'
import { fetchSourceSessions, type SourceFailure, type SourceResult } from './source'
import type { DiarySession } from './types'

// Server-only. Asks Balla Bot for sessions and brings the saved copy in line.
// Never throws: on any failure the Diary shows what it saved last time.

export const FIRST_SYNC_FROM = '2018-01-01T00:00:00.000Z'
const DAY_MS = 24 * 60 * 60 * 1000

export type SyncFailure = SourceFailure | 'database'

export interface SyncResult {
  fresh: boolean
  lastSuccessAt: string | null
  failure?: SyncFailure
}

interface SyncOptions {
  now?: Date
  fetchSessions?: (window: { from: string; to: string }) => Promise<SourceResult>
}

export async function syncDiary(db: PostgrestClient, userId: string, options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? new Date()
  const fetchSessions = options.fetchSessions ?? ((window) => fetchSourceSessions(window))

  const [{ data: existing, error: readError }, { data: status }] = await Promise.all([
    db.from('diary_sessions').select('*').eq('user_id', userId),
    db.from('diary_sync_status').select('last_success_at').eq('user_id', userId).maybeSingle(),
  ])
  const lastSuccessAt = (status?.last_success_at as string | null | undefined) ?? null
  if (readError || !existing) return { fresh: false, lastSuccessAt, failure: 'database' }

  const rows = existing as DiarySession[]
  const from = rows.length === 0 ? new Date(FIRST_SYNC_FROM) : new Date(now.getTime() - 60 * DAY_MS)
  const to = new Date(now.getTime() + 365 * DAY_MS)

  const source = await fetchSessions({ from: from.toISOString(), to: to.toISOString() })
  if (!source.ok) {
    await db.from('diary_sync_status').upsert({
      user_id: userId,
      last_success_at: lastSuccessAt,
      last_error: source.reason,
      last_error_at: now.toISOString(),
    })
    return { fresh: false, lastSuccessAt, failure: source.reason }
  }

  const { upserts, markRemoved } = reconcile(rows, source.sessions, { from, to, now })

  if (upserts.length > 0) {
    const { error } = await db
      .from('diary_sessions')
      .upsert(upserts.map((u) => ({ ...u, user_id: userId })), { onConflict: 'user_id,source_id' })
    if (error) return { fresh: false, lastSuccessAt, failure: 'database' }
  }
  if (markRemoved.length > 0) {
    const { error } = await db
      .from('diary_sessions')
      .update({ status: 'removed', updated_at: now.toISOString() })
      .eq('user_id', userId)
      .in('id', markRemoved)
    if (error) return { fresh: false, lastSuccessAt, failure: 'database' }
  }

  const nowIso = now.toISOString()
  await db.from('diary_sync_status').upsert({
    user_id: userId,
    last_success_at: nowIso,
    last_error: null,
    last_error_at: null,
  })
  return { fresh: true, lastSuccessAt: nowIso }
}
