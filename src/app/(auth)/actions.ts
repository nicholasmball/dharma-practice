'use server'

import { signIn, signOut } from '@/auth'

// Kicks off the Google OAuth flow. Auth.js takes it from here: redirect to
// Google, back to our callback, then the signIn/jwt/session callbacks in
// src/auth.ts (allowlist check + email->UUID mapping) decide whether a
// session gets created. A refusal lands back on /login with
// `?error=AccessDenied` rather than throwing here.
export async function googleSignIn() {
  await signIn('google', { redirectTo: '/dashboard' })
}

// Used by the "Try a different Google account" recovery link on the
// refusal screen — forces Google's account chooser instead of silently
// re-trying the same (refused) account.
export async function googleSignInWithAccountPicker() {
  await signIn('google', { redirectTo: '/dashboard' }, { prompt: 'select_account' })
}

export async function logout() {
  await signOut({ redirectTo: '/' })
}
