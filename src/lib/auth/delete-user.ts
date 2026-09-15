import { Pool } from 'pg'

// `auth.users` isn't exposed through PostgREST (see lookup-user.ts), so
// deleting the account's own auth row has to go straight to Postgres too —
// there's no PostgREST table, and therefore no service-role token, to mint
// for this. The pool is created lazily so importing this module never
// tries to open a connection before DATABASE_URL is configured.
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

/**
 * Deletes a user's row from `auth.users` on the mini.
 *
 * Replaces the old Supabase admin client's `auth.admin.deleteUser()`.
 * Callers must only ever pass the caller's own signed-in id (from
 * `getCurrentUser()`) — this function does no authorization of its own.
 */
export async function deleteUserAccount(
  authenticatedUserId: string
): Promise<{ error: string } | { success: true }> {
  if (!authenticatedUserId) {
    return { error: 'No authenticated user ID provided' }
  }

  try {
    await getPool().query('delete from auth.users where id = $1', [authenticatedUserId])
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error deleting user' }
  }
}
