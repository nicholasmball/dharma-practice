import type { DefaultSession } from 'next-auth'

// Augments Auth.js's built-in types with the mapped internal user id we
// stash on the token/session in src/auth.ts (see the jwt/session
// callbacks) — this is the id getCurrentUser() hands back to callers.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
  }
}
