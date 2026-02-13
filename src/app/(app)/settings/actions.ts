'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CustomPracticeType } from '@/lib/types'

export async function getCustomPracticeTypes(): Promise<CustomPracticeType[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('custom_practice_types')
    .eq('user_id', user.id)
    .single()

  return (settings?.custom_practice_types as CustomPracticeType[]) || []
}

export async function saveCustomPracticeTypes(customTypes: CustomPracticeType[]) {
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
        custom_practice_types: customTypes,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        custom_practice_types: customTypes,
      })

    if (error) return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/timer')
  revalidatePath('/journal')
  return { success: true }
}

export async function updateSettings(data: {
  meditation_reminder_enabled: boolean
  meditation_reminder_time: string | null
  journal_reminder_enabled: boolean
  journal_reminder_time: string | null
  default_session_duration: number
  default_practice_type: string
  bell_sound: string
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

export async function deleteAccount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Delete all user data from each table
  const { error: sessionsError } = await supabase
    .from('meditation_sessions')
    .delete()
    .eq('user_id', user.id)

  if (sessionsError) {
    return { error: 'Failed to delete meditation sessions: ' + sessionsError.message }
  }

  const { error: entriesError } = await supabase
    .from('journal_entries')
    .delete()
    .eq('user_id', user.id)

  if (entriesError) {
    return { error: 'Failed to delete journal entries: ' + entriesError.message }
  }

  const { error: conversationsError } = await supabase
    .from('teacher_conversations')
    .delete()
    .eq('user_id', user.id)

  if (conversationsError) {
    return { error: 'Failed to delete conversations: ' + conversationsError.message }
  }

  const { error: settingsError } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', user.id)

  if (settingsError) {
    return { error: 'Failed to delete settings: ' + settingsError.message }
  }

  // Delete the user from Supabase Auth using admin client
  const adminClient = createAdminClient()
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)

  if (deleteUserError) {
    return { error: 'Failed to delete user account: ' + deleteUserError.message }
  }

  // Sign out the user (clears local session)
  await supabase.auth.signOut()

  return { success: true }
}
