'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PracticeType } from '@/lib/types'

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

  const now = new Date().toISOString()
  const startedAt = new Date(Date.now() - data.duration_seconds * 1000).toISOString()

  const { error } = await supabase.from('meditation_sessions').insert({
    user_id: user.id,
    started_at: startedAt,
    ended_at: now,
    duration_seconds: data.duration_seconds,
    practice_type: data.practice_type,
    completed: true,
    notes: data.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/stats')
  revalidatePath('/timer')

  return { success: true }
}
