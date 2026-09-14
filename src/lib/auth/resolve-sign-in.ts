export interface ResolveSignInResult {
  allowed: boolean
  userId: string | null
}

export interface ResolveSignInDeps {
  isEmailAllowed: (email: string) => boolean
  findUserIdByEmail: (email: string) => Promise<string | null>
}

/**
 * The allowlist + mapping decision from requirements section 6, pulled out
 * of the Auth.js `signIn` callback so it can be unit-tested without
 * standing up NextAuth or a database. Deps are injected rather than
 * imported directly for the same reason.
 *
 * Both "not on the allowlist" and "allowlisted but no matching auth.users
 * row" come back as `allowed: false` — per the requirements doc's
 * recommended rule, an unmapped email is refused exactly like a
 * non-allowlisted one, never auto-created.
 */
export async function resolveSignIn(
  email: string | null | undefined,
  deps: ResolveSignInDeps
): Promise<ResolveSignInResult> {
  if (!email || !deps.isEmailAllowed(email)) {
    return { allowed: false, userId: null }
  }

  const userId = await deps.findUserIdByEmail(email)
  if (!userId) {
    return { allowed: false, userId: null }
  }

  return { allowed: true, userId }
}
