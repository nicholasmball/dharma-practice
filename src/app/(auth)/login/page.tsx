'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '../actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="mb-8 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]" />
      </Link>

      <h1 className="text-3xl font-light mb-2">Welcome Back</h1>
      <p className="text-[var(--muted)] mb-8">Continue your practice</p>

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
            className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
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
            className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-8 text-[var(--muted)] text-sm">
        New to Dharma Practice?{' '}
        <Link href="/signup" className="text-[var(--accent)] hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  )
}
