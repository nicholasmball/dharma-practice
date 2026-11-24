'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/postgrest/client'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isDiaryUser } from '@/lib/diary/access'

type Result = { success: true } | { error: string }

async function updateFlag(id: string, patch: { skipped: boolean } | { writeup_dismissed: boolean }): Promise<Result> {
  const user = await getCurrentUser()
  if (!user || !isDiaryUser(user.email)) return { error: 'Not allowed' }

  const db = await createClient()
  const { error } = await db
    .from('diary_sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/diary')
  revalidatePath('/dashboard')
  return { success: true }
}

/** "Didn't happen" (and its undo): takes the session out of the counts. */
export async function setSkipped(id: string, skipped: boolean): Promise<Result> {
  return updateFlag(id, { skipped })
}

/** "No write-up needed" (and its undo): clears the waiting marker. */
export async function setWriteUpDismissed(id: string, dismissed: boolean): Promise<Result> {
  return updateFlag(id, { writeup_dismissed: dismissed })
}
