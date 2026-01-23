'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { PracticeType } from '@/lib/types'

export async function createJournalEntry(data: {
  title?: string
  content: string
  tags: string[]
  practice_type?: PracticeType
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('journal_entries').insert({
    user_id: user.id,
    title: data.title || null,
    content: data.content,
    tags: data.tags,
    practice_type: data.practice_type || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')
  redirect('/journal')
}

export async function updateJournalEntry(id: string, data: {
  title?: string
  content: string
  tags: string[]
  practice_type?: PracticeType
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('journal_entries')
    .update({
      title: data.title || null,
      content: data.content,
      tags: data.tags,
      practice_type: data.practice_type || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')
  redirect('/journal')
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')
  return { success: true }
}
