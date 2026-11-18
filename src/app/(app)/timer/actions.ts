'use server'

import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { revalidatePath } from 'next/cache'
import { linkDiarySession } from '@/lib/diary/lookup'
import { BuiltInPracticeType, practiceTypeLabels, BUILT_IN_PRACTICE_TYPES, CustomPracticeType } from '@/lib/types'

export async function saveSession(data: {
  duration_seconds: number
  practice_type: string
  notes?: string
  // Set when the sit was started from a Diary session ("Log a sit").
  diarySourceId?: string
}) {
  const user = await getCurrentUser()
  const db = await createClient()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const now = new Date()
  const startedAt = new Date(Date.now() - data.duration_seconds * 1000).toISOString()

  // Save the meditation session
  const { data: saved, error } = await db.from('meditation_sessions').insert({
    user_id: user.id,
    started_at: startedAt,
    ended_at: now.toISOString(),
    duration_seconds: data.duration_seconds,
    practice_type: data.practice_type,
    completed: true,
    notes: data.notes || null,
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  let diaryLinked = true
  if (data.diarySourceId) {
    diaryLinked = await linkDiarySession(db, user.id, data.diarySourceId, { meditation_session_id: saved.id })
  }

  // If notes were provided, also create a journal entry
  if (data.notes && data.notes.trim()) {
    const durationMinutes = Math.floor(data.duration_seconds / 60)
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Get the short practice type name
    let practiceTypeName: string
    if (BUILT_IN_PRACTICE_TYPES.includes(data.practice_type as BuiltInPracticeType)) {
      // Built-in type: use the label
      practiceTypeName = practiceTypeLabels[data.practice_type as BuiltInPracticeType].split(' (')[0]
    } else {
      // Custom type: fetch from settings to get proper capitalization
      const { data: settings } = await db
        .from('user_settings')
        .select('custom_practice_types')
        .eq('user_id', user.id)
        .single()

      const customTypes = (settings?.custom_practice_types as CustomPracticeType[]) || []
      const customType = customTypes.find(ct => ct.name.toLowerCase() === data.practice_type.toLowerCase())
      practiceTypeName = customType?.name || (data.practice_type.charAt(0).toUpperCase() + data.practice_type.slice(1))
    }

    const title = `${practiceTypeName} - ${dateStr} - ${durationMinutes} min`

    const { data: entry } = await db.from('journal_entries').insert({
      user_id: user.id,
      title: title,
      content: data.notes.trim(),
      tags: ['session notes'],
      practice_type: data.practice_type,
    }).select('id').single()

    // Notes written after a Diary sit count as its write-up, unless it has one already.
    if (data.diarySourceId && entry) {
      await linkDiarySession(db, user.id, data.diarySourceId, { journal_entry_id: entry.id })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/stats')
  revalidatePath('/timer')
  revalidatePath('/journal')
  if (data.diarySourceId) revalidatePath('/diary')

  return { success: true, diaryLinked }
}
