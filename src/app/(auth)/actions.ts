'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// In-memory rate limiter for auth actions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 5 // max attempts per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Rate limit login attempts per email (prevents brute force)
  if (!checkRateLimit(`login:${email.toLowerCase()}`)) {
    return { error: 'Too many login attempts. Please try again in a few minutes.' }
  }

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

  // Rate limit signup attempts per email (prevents abuse)
  if (!checkRateLimit(`signup:${email.toLowerCase()}`)) {
    return { error: 'Too many attempts. Please try again in a few minutes.' }
  }

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

export async function resetPasswordRequest(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  // Rate limit by email to prevent email flooding
  if (!checkRateLimit(`reset:${email.toLowerCase()}`)) {
    // Always return success to prevent email enumeration
    return { success: true, message: 'If an account exists with this email, you\'ll receive a password reset link.' }
  }

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://buddha-balla.com'}/reset-password`,
  })

  // Always return the same message regardless of whether email exists (prevents enumeration)
  return { success: true, message: 'If an account exists with this email, you\'ll receive a password reset link.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
