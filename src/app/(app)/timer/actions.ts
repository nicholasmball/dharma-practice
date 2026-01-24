'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PracticeType, practiceTypeLabels } from '@/lib/types'

export async function saveSession(data: {
  duration_seconds: number
  practice_type: PracticeType
  notes?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const now = new Date()
  const startedAt = new Date(Date.now() - data.duration_seconds * 1000).toISOString()

  // Save the meditation session
  const { error } = await supabase.from('meditation_sessions').insert({
    user_id: user.id,
    started_at: startedAt,
    ended_at: now.toISOString(),
    duration_seconds: data.duration_seconds,
    practice_type: data.practice_type,
    completed: true,
    notes: data.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  // If notes were provided, also create a journal entry
  if (data.notes && data.notes.trim()) {
    const durationMinutes = Math.floor(data.duration_seconds / 60)
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Get the short practice type name (e.g., "Shamatha" not "Shamatha (Calm Abiding)")
    const practiceTypeName = practiceTypeLabels[data.practice_type].split(' (')[0]

    const title = `${practiceTypeName} - ${dateStr} - ${durationMinutes} min`

    await supabase.from('journal_entries').insert({
      user_id: user.id,
      title: title,
      content: data.notes.trim(),
      tags: ['session notes'],
      practice_type: data.practice_type,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/stats')
  revalidatePath('/timer')
  revalidatePath('/journal')

  return { success: true }
}
