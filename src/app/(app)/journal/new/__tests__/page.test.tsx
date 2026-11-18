import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { row } from '@/lib/diary/__tests__/fixtures'
import type { DiarySession } from '@/lib/diary/types'

// Same trap as the timer: Next keeps the form mounted when only the query string
// changes, so a write-up's pre-filled title and tags would carry over to a plain
// new entry (or to another session's write-up) unless the form is keyed on it.

let diarySession: DiarySession | null = null

vi.mock('@/lib/auth/get-current-user', () => ({ getCurrentUser: async () => ({ id: 'user-1' }) }))
vi.mock('@/lib/postgrest/client', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
  }),
}))
vi.mock('@/lib/diary/lookup', () => ({ findDiarySession: async () => diarySession }))
vi.mock('../../JournalForm', () => ({ default: function JournalForm() { return null } }))

const { default: NewJournalEntryPage } = await import('../page')
const { default: JournalForm } = await import('../../JournalForm')

async function form(diary?: string) {
  const page = (await NewJournalEntryPage({ searchParams: Promise.resolve(diary ? { diary } : {}) })) as ReactElement<{
    children: ReactNode
  }>
  const found = Children.toArray(page.props.children).find((c) => isValidElement(c) && c.type === JournalForm)
  return found as ReactElement<{ diarySourceId?: string }>
}

describe('new journal entry page', () => {
  beforeEach(() => {
    diarySession = null
  })

  it('keys the form on the diary session, so a plain entry starts empty', async () => {
    diarySession = row({ source_id: 'gcal:example-group-1' })
    const linked = await form('gcal:example-group-1')
    expect(linked.props.diarySourceId).toBe('gcal:example-group-1')

    diarySession = null
    const plain = await form()
    expect(plain.props.diarySourceId).toBeUndefined()
    // Children.toArray rewrites keys (".$" prefix, ":" escaped), so compare loosely.
    expect(plain.key).not.toBe(linked.key)
    expect(String(linked.key)).toContain('example-group-1')
    expect(String(plain.key)).toContain('plain')
  })
})
