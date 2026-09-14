import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { isEmailAllowed } from '@/lib/auth/allowlist'
import { findUserIdByEmail } from '@/lib/auth/lookup-user'
import { resolveSignIn } from '@/lib/auth/resolve-sign-in'

// Auth.js v5 config: Google sign-in only, gated by an email allowlist and
// mapped onto the internal user id the rest of the app's data is keyed on.
// See docs/mini-move-4-auth-requirements.md for the full flow this
// implements (section 5) and the allowlist/mapping rules (section 6).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    // Sending errors back to /login (instead of Auth.js's default error
    // page) is what lets the login page render the "you don't have
    // access yet" state from the design doc using the `?error=` query param.
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // This is the allowlist + mapping gate from requirements section 6.
    // Returning `false` here refuses the sign-in cleanly: Auth.js creates
    // no session and mints no token, and redirects back to /login with
    // `error=AccessDenied`.
    async signIn({ user }) {
      const result = await resolveSignIn(user.email, { isEmailAllowed, findUserIdByEmail })
      if (!result.allowed || !result.userId) {
        return false
      }

      // Overwrite the OAuth-issued id with the mapped internal UUID so the
      // jwt/session callbacks below (and getCurrentUser()) carry the id the
      // rest of the app's data is keyed on, not Google's own sub.
      user.id = result.userId
      return true
    },
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in call; persist the
      // mapped id onto the token so it survives subsequent requests.
      if (user?.id) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId
      }
      return session
    },
  },
})
