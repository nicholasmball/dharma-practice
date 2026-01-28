import { createClient } from '@/lib/supabase/server'
import { CustomPracticeType } from '@/lib/types'
import JournalForm from '../JournalForm'

export default async function NewJournalEntryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('custom_practice_types')
    .eq('user_id', user?.id)
    .single()

  const customPracticeTypes = (settings?.custom_practice_types as CustomPracticeType[]) || []

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px' }}>
        New Journal Entry
      </h1>
      <JournalForm customPracticeTypes={customPracticeTypes} />
    </div>
  )
}
