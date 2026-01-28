import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CustomPracticeType } from '@/lib/types'
import JournalForm from '../../JournalForm'

export default async function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: entry } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (!entry) {
    notFound()
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('custom_practice_types')
    .eq('user_id', user?.id)
    .single()

  const customPracticeTypes = (settings?.custom_practice_types as CustomPracticeType[]) || []

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px' }}>
        Edit Entry
      </h1>
      <JournalForm
        initialData={{
          id: entry.id,
          title: entry.title,
          content: entry.content,
          tags: entry.tags || [],
          practice_type: entry.practice_type,
        }}
        customPracticeTypes={customPracticeTypes}
      />
    </div>
  )
}
