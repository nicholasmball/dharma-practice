import { describe, expect, it, vi } from 'vitest'
import type { PostgrestClient } from '@supabase/postgrest-js'
import { FIRST_SYNC_FROM, syncDiary } from '../sync'
import type { SourceResult } from '../source'
import type { DiarySession } from '../types'
import { michaelCoaching, row } from './fixtures'

const now = new Date('2037-11-18T05:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

type Call = { table: string; op: string; args: unknown[] }

// A stand-in for the database that records every write and answers reads
// from the rows given. Only the calls sync.ts makes are supported.
function fakeDb(opts: { rows?: DiarySession[]; lastSuccessAt?: string | null; readError?: boolean; writeError?: boolean }) {
  const calls: Call[] = []
  const result = (data: unknown, failed = false) => ({ data, error: failed ? { message: 'boom' } : null })
  const db = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              if (table === 'diary_sync_status') {
                return { maybeSingle: async () => result(opts.lastSuccessAt ? { last_success_at: opts.lastSuccessAt } : null) }
              }
              return Promise.resolve(opts.readError ? result(null, true) : result(opts.rows ?? []))
            },
          }
        },
        upsert(...args: unknown[]) {
          calls.push({ table, op: 'upsert', args })
          return Promise.resolve(result(null, table === 'diary_sessions' && opts.writeError))
        },
        update(...args: unknown[]) {
          calls.push({ table, op: 'update', args })
          return { eq: () => ({ in: async (...inArgs: unknown[]) => {
            calls.push({ table, op: 'update.in', args: inArgs })
            return result(null, opts.writeError)
          } }) }
        },
      }
    },
  }
  return { db: db as unknown as PostgrestClient, calls }
}

const ok = (sessions = [michaelCoaching]): SourceResult => ({ ok: true, sessions })

describe('syncDiary', () => {
  it('asks from 2018 on the first sync, and up to a year ahead', async () => {
    const { db } = fakeDb({ rows: [] })
    const fetchSessions = vi.fn<(window: { from: string; to: string }) => Promise<SourceResult>>(async () => ok())
    await syncDiary(db, 'user-1', { now, fetchSessions })
    expect(fetchSessions).toHaveBeenCalledWith({
      from: FIRST_SYNC_FROM,
      to: new Date(now.getTime() + 365 * DAY_MS).toISOString(),
    })
  })

  it('asks from 60 days ago once it has saved sessions', async () => {
    const { db } = fakeDb({ rows: [row()] })
    const fetchSessions = vi.fn<(window: { from: string; to: string }) => Promise<SourceResult>>(async () => ok())
    await syncDiary(db, 'user-1', { now, fetchSessions })
    expect(fetchSessions.mock.calls[0][0].from).toBe(new Date(now.getTime() - 60 * DAY_MS).toISOString())
  })

  it('saves new sessions for this user and records the successful sync', async () => {
    const { db, calls } = fakeDb({ rows: [] })
    const result = await syncDiary(db, 'user-1', { now, fetchSessions: async () => ok() })

    expect(result).toEqual({ fresh: true, lastSuccessAt: now.toISOString() })
    const save = calls.find((c) => c.table === 'diary_sessions' && c.op === 'upsert')!
    const [saved, options] = save.args as [Array<{ user_id: string; source_id: string }>, unknown]
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ user_id: 'user-1', source_id: michaelCoaching.id })
    expect(options).toEqual({ onConflict: 'user_id,source_id' })
    const status = calls.find((c) => c.table === 'diary_sync_status')!
    expect(status.args[0]).toMatchObject({ user_id: 'user-1', last_success_at: now.toISOString(), last_error: null })
  })

  it('marks a future session that has gone from the calendar as removed', async () => {
    const gone = row({ source_id: 'gcal:gone', starts_at: '2037-12-02T10:00:00Z', ends_at: '2037-12-02T11:00:00Z' })
    const { db, calls } = fakeDb({ rows: [gone] })
    await syncDiary(db, 'user-1', { now, fetchSessions: async () => ok([]) })
    expect(calls.find((c) => c.op === 'update')!.args[0]).toMatchObject({ status: 'removed' })
    expect(calls.find((c) => c.op === 'update.in')!.args).toEqual(['id', [gone.id]])
  })

  it('keeps the last good time and records the reason when Balla Bot fails', async () => {
    const last = '2037-11-17T05:00:00.000Z'
    const { db, calls } = fakeDb({ rows: [row()], lastSuccessAt: last })
    const result = await syncDiary(db, 'user-1', { now, fetchSessions: async () => ({ ok: false, reason: 'unreachable' }) })

    expect(result).toEqual({ fresh: false, lastSuccessAt: last, failure: 'unreachable' })
    expect(calls.filter((c) => c.table === 'diary_sessions')).toEqual([])
    expect(calls[0].args[0]).toMatchObject({ last_success_at: last, last_error: 'unreachable' })
  })

  it('reports a database failure rather than claiming success', async () => {
    const readFail = fakeDb({ readError: true })
    const fetchSessions = vi.fn<(window: { from: string; to: string }) => Promise<SourceResult>>(async () => ok())
    expect(await syncDiary(readFail.db, 'user-1', { now, fetchSessions })).toMatchObject({ fresh: false, failure: 'database' })
    expect(fetchSessions).not.toHaveBeenCalled()

    const writeFail = fakeDb({ rows: [], writeError: true })
    const result = await syncDiary(writeFail.db, 'user-1', { now, fetchSessions: async () => ok() })
    expect(result).toMatchObject({ fresh: false, failure: 'database' })
    expect(writeFail.calls.some((c) => c.table === 'diary_sync_status')).toBe(false)
  })
})
