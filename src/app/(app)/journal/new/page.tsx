import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { CustomPracticeType } from '@/lib/types'
import { findDiarySession } from '@/lib/diary/lookup'
import { writeUpDefaults } from '@/lib/diary/counts'
import JournalForm from '../JournalForm'

export default async function NewJournalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ diary?: string }>
}) {
  const [user, db, { diary }] = await Promise.all([getCurrentUser(), createClient(), searchParams])

  const [{ data: settings }, diarySession] = await Promise.all([
    db
      .from('user_settings')
      .select('custom_practice_types')
      .eq('user_id', user?.id)
      .single(),
    findDiarySession(db, user, diary),
  ])

  const customPracticeTypes = (settings?.custom_practice_types as CustomPracticeType[]) || []
  const defaults = diarySession ? writeUpDefaults(diarySession) : null

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: defaults ? '8px' : '32px' }}>
        New Journal Entry
      </h1>
      {defaults && (
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 24px' }}>{defaults.intro}</p>
      )}
      <JournalForm
        customPracticeTypes={customPracticeTypes}
        initialDefaults={defaults ? { title: defaults.title, tags: defaults.tags } : undefined}
        diarySourceId={diarySession?.source_id}
      />
    </div>
  )
}
