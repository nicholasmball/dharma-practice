'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSettings(data: {
  meditation_reminder_enabled: boolean
  meditation_reminder_time: string | null
  journal_reminder_enabled: boolean
  journal_reminder_time: string | null
  default_session_duration: number
  default_practice_type: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        ...data,
      })

    if (error) return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function exportUserData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get all user data
  const { data: sessions } = await supabase
    .from('meditation_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const exportData = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    meditation_sessions: sessions || [],
    journal_entries: entries || [],
    settings: settings || null,
  }

  return { data: exportData }
}
