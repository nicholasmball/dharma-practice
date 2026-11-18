import type { DiarySession, SourceSession } from './types'

// Works out how to bring the saved diary rows in line with a fresh reply from
// Balla Bot. Pure, so it is tested without a database.
//
// - Every session in the reply is saved by its Balla Bot id (one bulk upsert).
//   Only the calendar's own fields are sent, so "didn't happen", "no write-up
//   needed" and the journal/sit links are never overwritten.
// - A saved session inside the asked-for window that is missing from the reply
//   and starts after (now - 1 day) is marked removed (e.g. cancelled in
//   Calendly). Older missing sessions are left alone, so history and links are
//   never lost because of a partial reply.
// - A removed session that comes back is saved as scheduled again.

export interface DiaryUpsert {
  source_id: string
  teacher: string
  kind: SourceSession['kind']
  title: string
  starts_at: string
  ends_at: string
  status: 'scheduled' | 'cancelled'
  last_seen_at: string
  updated_at: string
}

export interface ReconcileResult {
  upserts: DiaryUpsert[]
  markRemoved: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function reconcile(
  existing: DiarySession[],
  incoming: SourceSession[],
  window: { from: Date; to: Date; now: Date }
): ReconcileResult {
  const nowIso = window.now.toISOString()
  const seen = new Set<string>()
  const upserts: DiaryUpsert[] = []

  for (const session of incoming) {
    if (seen.has(session.id)) continue
    seen.add(session.id)
    upserts.push({
      source_id: session.id,
      teacher: session.teacher,
      kind: session.kind,
      title: session.title,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      status: session.status === 'cancelled' ? 'cancelled' : 'scheduled',
      last_seen_at: nowIso,
      updated_at: nowIso,
    })
  }

  const removeAfter = window.now.getTime() - DAY_MS
  const markRemoved = existing
    .filter((row) => {
      if (row.status === 'removed' || seen.has(row.source_id)) return false
      const start = Date.parse(row.starts_at)
      return start >= window.from.getTime() && start <= window.to.getTime() && start > removeAfter
    })
    .map((row) => row.id)

  return { upserts, markRemoved }
}
