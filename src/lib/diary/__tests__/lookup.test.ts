import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostgrestClient } from '@supabase/postgrest-js'
import { row } from './fixtures'
import type { DiarySession } from '../types'

const syncDiary = vi.fn()
vi.mock('../sync', () => ({ syncDiary: (...args: unknown[]) => syncDiary(...args) }))

const { findDiarySession } = await import('../lookup')

const user = { id: 'user-1', email: 'me@example.com' } as never

// Database stand-in: the stored rows start as given, and a sync can add more.
function fakeDb(stored: DiarySession[], opts: { readError?: boolean } = {}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: (_col: string, sourceId: string) => ({
            maybeSingle: async () =>
              opts.readError
                ? { data: null, error: { message: 'boom' } }
                : { data: stored.find((r) => r.source_id === sourceId) ?? null, error: null },
          }),
        }),
      }),
    }),
  } as unknown as PostgrestClient
}

describe('findDiarySession', () => {
  beforeEach(() => {
    process.env.DIARY_USER_EMAILS = 'me@example.com'
    syncDiary.mockReset()
  })

  it('returns a stored session without syncing', async () => {
    const stored = [row({ source_id: 'gcal:a' })]
    const found = await findDiarySession(fakeDb(stored), user, 'gcal:a')
    expect(found?.source_id).toBe('gcal:a')
    expect(syncDiary).not.toHaveBeenCalled()
  })

  it('syncs and then finds a session the app has never stored (link tapped before the Diary tab was opened)', async () => {
    const stored: DiarySession[] = []
    syncDiary.mockImplementation(async () => {
      stored.push(row({ source_id: 'gcal:new' }))
      return { fresh: true, lastSuccessAt: null }
    })
    const found = await findDiarySession(fakeDb(stored), user, 'gcal:new')
    expect(syncDiary).toHaveBeenCalledTimes(1)
    expect(found?.source_id).toBe('gcal:new')
  })

  it('returns null, without throwing, when the session still is not found after syncing', async () => {
    syncDiary.mockResolvedValue({ fresh: false, lastSuccessAt: null, failure: 'unreachable' })
    expect(await findDiarySession(fakeDb([]), user, 'gcal:missing')).toBeNull()
  })

  it('returns null if the sync itself throws', async () => {
    syncDiary.mockRejectedValue(new Error('down'))
    expect(await findDiarySession(fakeDb([]), user, 'gcal:missing')).toBeNull()
  })

  it('does not sync for non-diary users or when there is no id', async () => {
    expect(await findDiarySession(fakeDb([]), { id: 'u', email: 'other@example.com' } as never, 'gcal:x')).toBeNull()
    expect(await findDiarySession(fakeDb([]), user, undefined)).toBeNull()
    expect(syncDiary).not.toHaveBeenCalled()
  })

  it('does not sync when the database read itself failed', async () => {
    expect(await findDiarySession(fakeDb([], { readError: true }), user, 'gcal:x')).toBeNull()
    expect(syncDiary).not.toHaveBeenCalled()
  })
})
