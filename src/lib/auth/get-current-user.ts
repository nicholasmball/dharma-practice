import { auth } from '@/auth'

export interface CurrentUser {
  id: string
  email: string
}

/**
 * Reads the Auth.js session and returns the signed-in user.
 *
 * `id` is the mapped internal UUID set by the signIn callback in
 * src/auth.ts (the same value minted into the PostgREST token's `sub`
 * claim), not Google's own account id — this is the contract Move 5 will
 * build on when it switches the ~25 existing `supabase.auth.getUser()`
 * call sites over to the mini gateway.
 *
 * Never throws for a signed-out visitor; callers decide whether to redirect.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
  }
}
