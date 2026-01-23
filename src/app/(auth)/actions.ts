'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://buddha-balla.com'}/dashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if email confirmation is required
  // If identities array is empty, email confirmation is needed
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists.' }
  }

  // If user exists but email not confirmed, show confirmation message
  if (data.user && !data.user.confirmed_at) {
    return { success: true, message: 'Check your email for a confirmation link to complete your registration.' }
  }

  // Create default user settings (only if user is confirmed)
  if (data.user && data.user.confirmed_at) {
    await supabase.from('user_settings').insert({
      user_id: data.user.id,
      meditation_reminder_enabled: false,
      journal_reminder_enabled: false,
      default_session_duration: 1200,
      default_practice_type: 'shamatha',
    })
    redirect('/dashboard')
  }

  // Email confirmation required
  return { success: true, message: 'Check your email for a confirmation link to complete your registration.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
