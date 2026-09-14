import { redirect } from 'next/navigation'

// Password sign-up is retired (Mini Move 4 — Google sign-in only, allowlist
// gated). Anyone with an old bookmark to /signup lands on /login instead of
// a dead page.
export default function SignupPage() {
  redirect('/login')
}
