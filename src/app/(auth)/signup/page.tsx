'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success && result?.message) {
      setSuccess(result.message)
      setLoading(false)
    }
  }

  // Show success message if email confirmation is needed
  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-8">
          <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>✉</span>
        </div>

        <h1 className="text-3xl font-light mb-4 text-center">Check Your Email</h1>

        <p className="text-[var(--muted)] mb-8 text-center max-w-sm">
          {success}
        </p>

        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Click the link in the email to verify your account.
          </p>
        </div>

        <Link
          href="/login"
          className="px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
        >
          Go to Sign In
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="mb-8 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]" />
      </Link>

      <h1 className="text-3xl font-light mb-2">Begin Your Journey</h1>
      <p className="text-[var(--muted)] mb-8">Create your practice space</p>

      <form action={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)] mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--muted)] mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--muted)] mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-[var(--background)]/30 border-t-[var(--background)] rounded-full animate-spin" />
          )}
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-8 text-[var(--muted)] text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
