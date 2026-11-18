'use server'

import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { PracticeType } from '@/lib/types'
import { linkDiarySession } from '@/lib/diary/lookup'

export async function createJournalEntry(data: {
  title?: string
  content: string
  tags: string[]
  practice_type?: PracticeType
  // Set when writing up a Diary session: the entry is linked to it and
  // saving goes back to the Diary.
  diarySourceId?: string
}) {
  const user = await getCurrentUser()
  const db = await createClient()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: entry, error } = await db
    .from('journal_entries')
    .insert({
      user_id: user.id,
      title: data.title || null,
      content: data.content,
      tags: data.tags,
      practice_type: data.practice_type || null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')

  if (data.diarySourceId) {
    const linked = await linkDiarySession(db, user.id, data.diarySourceId, { journal_entry_id: entry.id })
    revalidatePath('/diary')
    revalidatePath('/dashboard')
    redirect(linked ? '/diary' : '/diary?notice=link-failed')
  }

  redirect('/journal')
}

export async function updateJournalEntry(id: string, data: {
  title?: string
  content: string
  tags: string[]
  practice_type?: PracticeType
}) {
  const user = await getCurrentUser()
  const db = await createClient()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await db
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
  const user = await getCurrentUser()
  const db = await createClient()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await db
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')
  // A Diary session linked to this entry goes back to "not written up".
  revalidatePath('/diary')
  revalidatePath('/dashboard')
  return { success: true }
}
