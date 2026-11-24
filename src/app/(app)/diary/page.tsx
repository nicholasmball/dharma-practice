import { redirect } from 'next/navigation'
import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isDiaryUser } from '@/lib/diary/access'
import { syncDiary } from '@/lib/diary/sync'
import type { DiarySession } from '@/lib/types'
import DiaryClient, { type DiaryRow } from './DiaryClient'

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!isDiaryUser(user.email)) redirect('/dashboard')

  const db = await createClient()
  const sync = await syncDiary(db, user.id)

  const { data, error } = await db
    .from('diary_sessions')
    .select('*, meditation_sessions(duration_seconds)')
    .eq('user_id', user.id)
    .neq('status', 'removed')
    .order('starts_at', { ascending: true })

  const rows: DiaryRow[] = ((data as (DiarySession & { meditation_sessions: { duration_seconds: number } | null })[] | null) ?? []).map(
    ({ meditation_sessions, ...row }) => ({ ...row, sit_seconds: meditation_sessions?.duration_seconds ?? null })
  )
  const { notice } = await searchParams

  return (
    <DiaryClient
      rows={rows}
      now={new Date().toISOString()}
      sync={sync}
      loadFailed={Boolean(error)}
      linkFailed={notice === 'link-failed' ? 'entry' : notice === 'sit-link-failed' ? 'sit' : null}
    />
  )
}
