import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { JournalEntry, CustomPracticeType } from '@/lib/types'
import JournalList from './JournalList'

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string; type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: entries } = await query

  // Get custom practice types from user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('custom_practice_types')
    .eq('user_id', user?.id)
    .single()

  const customPracticeTypes = (settings?.custom_practice_types as CustomPracticeType[]) || []

  // Get all unique tags for filtering
  const allTags = new Set<string>()
  entries?.forEach(entry => {
    entry.tags?.forEach((tag: string) => allTags.add(tag))
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300 }}>Practice Journal</h1>
        <Link
          href="/journal/new"
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          New Entry
        </Link>
      </div>

      <JournalList
        entries={entries || []}
        allTags={Array.from(allTags)}
        initialSearch={params.search}
        initialTag={params.tag}
        initialType={params.type}
        customPracticeTypes={customPracticeTypes}
      />
    </div>
  )
}
