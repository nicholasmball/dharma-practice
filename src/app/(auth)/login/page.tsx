import { Suspense } from 'react'
import LoginScreen from './LoginScreen'

// Auth.js redirects back here with `?error=...` on a refused or failed
// sign-in, so the screen needs access to search params — wrapped in
// Suspense per Next.js App Router convention for that.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}
