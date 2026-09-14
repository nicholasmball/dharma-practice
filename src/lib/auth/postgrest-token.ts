import { SignJWT } from 'jose'

// How long a minted gateway token stays valid for. Kept short per the
// requirements doc (section 9): "minutes, not days", minted server-side
// per use so it never has a chance to outlive the Auth.js session.
const TOKEN_TTL_SECONDS = 5 * 60

/**
 * Mints a short-lived HS256 JWT that PostgREST (on the mini) will accept.
 *
 * The mini's `auth.uid()` shim reads the token's `sub` claim as the caller's
 * user id, and Row Level Security only returns rows that belong to that id.
 * `role: "authenticated"` is required too — anything else and PostgREST/RLS
 * treats the request as anonymous. This token is server-only: nothing here
 * should ever be sent to the browser.
 *
 * @param userId - the mapped internal UUID (matches `auth.users.id` on the mini)
 */
export async function mintPostgrestToken(userId: string): Promise<string> {
  const secret = process.env.POSTGREST_JWT_SECRET
  if (!secret) {
    throw new Error('POSTGREST_JWT_SECRET is not set')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)

  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret))
}
