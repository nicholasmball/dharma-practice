import type { PostgrestClient } from '@supabase/postgrest-js'
import type { CurrentUser } from '@/lib/auth/get-current-user'
import { isDiaryUser } from './access'
import { syncDiary } from './sync'
import type { DiarySession } from './types'

async function readSession(db: PostgrestClient, userId: string, sourceId: string) {
  return db
    .from('diary_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .maybeSingle()
}

/**
 * Finds the signed-in user's diary session for a `?diary=<id>` link.
 * If the session isn't stored yet (the link was tapped before the Diary tab
 * was ever opened), it runs the same sync the Diary tab uses and looks again.
 * Returns null for anyone who isn't a diary user, for an id that still isn't
 * found, or when the diary tables aren't there yet, so the journal and timer
 * pages work as normal in every one of those cases.
 */
export async function findDiarySession(
  db: PostgrestClient,
  user: CurrentUser | null,
  sourceId: string | undefined
): Promise<DiarySession | null> {
  if (!user || !sourceId || !isDiaryUser(user.email)) return null
  const first = await readSession(db, user.id, sourceId)
  if (first.error) return null
  if (first.data) return first.data as DiarySession

  try {
    await syncDiary(db, user.id)
  } catch {
    return null
  }
  const second = await readSession(db, user.id, sourceId)
  if (second.error || !second.data) return null
  return second.data as DiarySession
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
