import { PostgrestClient } from '@supabase/postgrest-js'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { mintPostgrestToken } from '@/lib/auth/postgrest-token'

// Thin PostgREST client replacing the old Supabase data client.
//
// Why @supabase/postgrest-js instead of a hand-rolled fetch wrapper: it's
// the standalone query builder Supabase publishes on its own (no auth,
// realtime, or storage bundled in — we don't want those here, Auth.js
// already owns sign-in and neither Realtime nor Storage exist on the mini).
// It gives every existing `.from('table').select()...` call site the exact
// same query-builder shape it already had, so Move 5 only has to change
// *where* the client comes from, not how each call reads.
//
// Server-only: this mints a short-lived token per request (Move 4's
// `mintPostgrestToken`) and must never run in the browser — see
// `/api/reminders` for how a client component gets data that used to come
// from the browser Supabase client.
function getPostgrestUrl(): string {
  const url = process.env.POSTGREST_URL
  if (!url) {
    throw new Error('POSTGREST_URL is not set')
  }
  return url
}

/**
 * Creates a PostgREST client scoped to the signed-in user.
 *
 * When there's a signed-in user (from the Auth.js session), every request
 * carries `Authorization: Bearer <token>` with that user's mapped UUID as
 * the token's `sub` claim, which is what the mini's RLS policies key off.
 * With no signed-in user, the client carries no Authorization header —
 * PostgREST then treats requests as anonymous, matching how the old
 * anon-key Supabase client behaved for a signed-out caller.
 */
export async function createClient(): Promise<PostgrestClient> {
  const user = await getCurrentUser()
  const headers: Record<string, string> = {}

  if (user) {
    const token = await mintPostgrestToken(user.id)
    headers.Authorization = `Bearer ${token}`
  }

  return new PostgrestClient(getPostgrestUrl(), { headers })
}
