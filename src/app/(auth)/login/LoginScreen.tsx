'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { googleSignIn, googleSignInWithAccountPicker } from '../actions'

// Google's brand guidelines require the exact wording and four-colour "G" —
// see docs/mini-move-4-login-design.html "Design intent".
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function EnsoMark({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width="60"
      height="60"
      aria-hidden="true"
      className={`mb-6 ${dimmed ? 'opacity-50' : 'opacity-85'}`}
    >
      <circle
        cx="256"
        cy="256"
        r="240"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeDasharray="1160 180"
        strokeLinecap="round"
      />
      <circle cx="256" cy="256" r="18" fill="var(--accent)" />
    </svg>
  )
}

export default function LoginScreen() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [signingIn, setSigningIn] = useState(false)

  // Auth.js's signIn callback in src/auth.ts returns `false` for both a
  // non-allowlisted email and an allowlisted-but-unmapped one (requirements
  // section 6) — both land here as AccessDenied. Any other error code
  // (dropped connection, Google outage, etc.) gets the generic-error state.
  const isRefused = errorParam === 'AccessDenied'
  const isGenericError = Boolean(errorParam) && !isRefused

  async function handleSignIn(pickAccount = false) {
    setSigningIn(true)
    try {
      if (pickAccount) {
        await googleSignInWithAccountPicker()
      } else {
        await googleSignIn()
      }
    } finally {
      // Only reached if the redirect didn't happen (e.g. it threw for a
      // reason other than the expected NEXT_REDIRECT) — reset so the
      // button doesn't stay stuck on "Connecting...".
      setSigningIn(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <Link href="/" className="mb-8 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]" />
      </Link>

      <EnsoMark dimmed={isRefused || isGenericError} />

      <h1 className="text-3xl font-light mb-2">Welcome Back</h1>
      <p className="text-[var(--muted)] mb-8">Continue your practice</p>

      {isRefused ? (
        <div className="w-full max-w-sm flex flex-col items-center">
          <div
            role="alert"
            className="w-full p-4 rounded-xl text-left flex gap-3"
            style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.45)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16.5" r="0.6" fill="var(--accent)" />
            </svg>
            <div>
              <h2 className="text-sm font-semibold mb-1">You don&rsquo;t have access yet</h2>
              <p className="text-sm text-[var(--muted)]">
                balladharma is open to a small group of invited practitioners right now, and that
                Google account isn&rsquo;t on the list. If you think it should be, ask Nick to add you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSignIn(true)}
            disabled={signingIn}
            className="mt-4 text-sm text-[var(--accent)] underline p-2 min-h-[44px] disabled:opacity-50"
          >
            Try a different Google account
          </button>
        </div>
      ) : isGenericError ? (
        <div className="w-full max-w-sm flex flex-col items-center">
          <div
            role="alert"
            className="w-full p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/45 text-left flex gap-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="16.5" r="0.6" fill="var(--error)" />
            </svg>
            <div>
              <h2 className="text-sm font-semibold mb-1">We couldn&rsquo;t finish signing you in</h2>
              <p className="text-sm text-[var(--muted)]">
                The connection to Google was interrupted. This is usually temporary. Check you&rsquo;re online and try again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSignIn(false)}
            disabled={signingIn}
            className="w-full max-w-[280px] min-h-[48px] mt-5 inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--background)] font-semibold rounded-xl disabled:opacity-50"
          >
            {signingIn ? 'Connecting to Google…' : 'Try signing in again'}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => handleSignIn(false)}
            disabled={signingIn}
            aria-live="polite"
            className="w-full max-w-[280px] min-h-[48px] inline-flex items-center justify-center gap-3 bg-white text-[#1f1f1f] border border-[#dadce0] rounded-xl font-semibold text-[0.98rem] px-5 disabled:cursor-wait"
          >
            {signingIn ? (
              <>
                <span className="w-[18px] h-[18px] rounded-full border-2 border-[#1f1f1f]/25 border-t-[#1f1f1f] animate-spin" />
                Connecting to Google&hellip;
              </>
            ) : (
              <>
                <GoogleIcon />
                Sign in with Google
              </>
            )}
          </button>
          <p className="mt-6 text-[var(--muted)] text-sm max-w-[260px]">
            balladharma is invite-only while we&rsquo;re in early access. Ask Nick if you&rsquo;d like to join.
          </p>
        </>
      )}
    </main>
  )
}
