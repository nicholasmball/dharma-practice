import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import TimerClient from './TimerClient'
import { CustomPracticeType } from '@/lib/types'
import { findDiarySession } from '@/lib/diary/lookup'
import { displayName, formatDayMonth } from '@/lib/diary/counts'

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ diary?: string }>
}) {
  const [user, db, { diary }] = await Promise.all([getCurrentUser(), createClient(), searchParams])

  const [{ data: settings }, diarySession] = await Promise.all([
    db
      .from('user_settings')
      .select('default_session_duration, default_practice_type, custom_practice_types, bell_sound')
      .eq('user_id', user?.id)
      .single(),
    findDiarySession(db, user, diary),
  ])

  return (
    <TimerClient
      defaultDuration={settings?.default_session_duration || 1200}
      defaultPracticeType={settings?.default_practice_type || 'shamatha'}
      customPracticeTypes={(settings?.custom_practice_types as CustomPracticeType[]) || []}
      bellSound={settings?.bell_sound || 'singing_bowl'}
      diaryLink={
        diarySession
          ? {
              sourceId: diarySession.source_id,
              label: `${displayName(diarySession)} · ${formatDayMonth(diarySession.starts_at)}`,
            }
          : null
      }
    />
  )
}
