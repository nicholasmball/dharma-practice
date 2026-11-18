import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { row } from '@/lib/diary/__tests__/fixtures'
import type { DiarySession } from '@/lib/diary/types'

// The timer page is a server component. Next does not remount a client
// component when only the query string changes, so going from "Log a sit"
// (/timer?diary=X) to Meditate (/timer) would keep the diary link unless the
// timer is keyed on it. These tests check that key.

let diarySession: DiarySession | null = null

vi.mock('@/lib/auth/get-current-user', () => ({ getCurrentUser: async () => ({ id: 'user-1' }) }))
vi.mock('@/lib/postgrest/client', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
  }),
}))
vi.mock('@/lib/diary/lookup', () => ({ findDiarySession: async () => diarySession }))
vi.mock('../TimerClient', () => ({ default: () => null }))

const { default: TimerPage } = await import('../page')

async function render(diary?: string) {
  return (await TimerPage({ searchParams: Promise.resolve(diary ? { diary } : {}) })) as ReactElement<{
    diaryLink: { sourceId: string } | null
  }>
}

describe('timer page', () => {
  beforeEach(() => {
    diarySession = null
  })

  it('gives a plain sit its own key and no diary link', async () => {
    const page = await render()
    expect(page.key).toBe('plain')
    expect(page.props.diaryLink).toBeNull()
  })

  it('keys a "Log a sit" timer on its diary session, so leaving it starts a fresh timer', async () => {
    diarySession = row({ source_id: 'gcal:example-coaching-1' })
    const linked = await render('gcal:example-coaching-1')
    expect(linked.key).toBe('gcal:example-coaching-1')
    expect(linked.props.diaryLink?.sourceId).toBe('gcal:example-coaching-1')

    diarySession = null
    const plain = await render()
    expect(plain.key).not.toBe(linked.key)
  })
})
