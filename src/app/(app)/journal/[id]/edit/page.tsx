import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JournalForm from '../../JournalForm'

export default async function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (!entry) {
    notFound()
  }

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
      />
    </div>
  )
}
