import type { PostgrestClient } from '@supabase/postgrest-js'
import type { CurrentUser } from '@/lib/auth/get-current-user'
import { isDiaryUser } from './access'
import type { DiarySession } from './types'

/**
 * Finds the signed-in user's diary session for a `?diary=<id>` link.
 * Returns null for anyone who isn't a diary user, for an unknown id, or when
 * the diary tables aren't there yet, so the journal and timer pages work as
 * normal in every one of those cases.
 */
export async function findDiarySession(
  db: PostgrestClient,
  user: CurrentUser | null,
  sourceId: string | undefined
): Promise<DiarySession | null> {
  if (!user || !sourceId || !isDiaryUser(user.email)) return null
  const { data, error } = await db
    .from('diary_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('source_id', sourceId)
    .maybeSingle()
  if (error || !data) return null
  return data as DiarySession
}

/**
 * Links a saved journal entry or sit to its diary session. A journal link is
 * only set when the session has none yet, so the first write-up stays the one
 * the Diary points at. Returns false when the link could not be saved.
 */
export async function linkDiarySession(
  db: PostgrestClient,
  userId: string,
  sourceId: string,
  link: { journal_entry_id: string } | { meditation_session_id: string }
): Promise<boolean> {
  let query = db
    .from('diary_sessions')
    .update({ ...link, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('source_id', sourceId)
  if ('journal_entry_id' in link) query = query.is('journal_entry_id', null)
  const { error } = await query
  return !error
}
