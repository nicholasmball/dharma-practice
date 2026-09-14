import { Pool } from 'pg'

// `auth.users` isn't exposed through PostgREST, so mapping a signed-in
// Google email to the matching internal account has to go straight to
// Postgres. The pool is created lazily (only when a lookup actually runs)
// so importing this module — e.g. at build time, or before DATABASE_URL is
// configured — never tries to open a connection.
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
 * Looks up the existing internal user id for a Google account's email.
 *
 * Matches lower-cased/trimmed against `auth.users.email` on the mini.
 * Returns null when no seeded account matches — callers must treat that as
 * a clean refusal, never as a reason to create an account.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase()

  const result = await getPool().query<{ id: string }>(
    'select id from auth.users where lower(email) = $1 limit 1',
    [normalizedEmail]
  )

  return result.rows[0]?.id ?? null
}
