import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/postgrest/client'
import { NextResponse } from 'next/server'

// ReminderChecker (a client component) used to read `user_settings`
// straight from the browser using Supabase's anon-key client. The
// PostgREST client's minted token is server-only (see
// src/lib/postgrest/client.ts), so that browser read now goes through this
// route instead — same data, same shape, just fetched rather than queried
// directly.
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ settings: null }, { status: 401 })
  }

  const db = await createClient()
  const { data: settings } = await db
    .from('user_settings')
    .select('meditation_reminder_enabled, meditation_reminder_time, journal_reminder_enabled, journal_reminder_time')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ settings: settings || null })
}
