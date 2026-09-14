import { handlers } from '@/auth'

// Auth.js v5's App Router convention: forward GET/POST straight to the
// handlers it builds from the config in src/auth.ts. Covers the OAuth
// sign-in kickoff, the Google callback, and session/CSRF endpoints.
export const { GET, POST } = handlers
