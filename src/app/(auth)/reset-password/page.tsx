'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setReady(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
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

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="mb-8 opacity-60 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]" />
      </Link>

      <h1 className="text-3xl font-light mb-2">Set New Password</h1>
      <p className="text-[var(--muted)] mb-8 text-center max-w-sm">
        Choose a new password for your account.
      </p>

      {success ? (
        <div className="w-full max-w-sm space-y-6">
          <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-sm">
            Password updated successfully! Redirecting to dashboard...
          </div>
        </div>
      ) : !ready && error ? (
        <div className="w-full max-w-sm space-y-6">
          <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
            {error}
          </div>
          <Link
            href="/forgot-password"
            className="block w-full px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors text-center"
          >
            Request New Reset Link
          </Link>
        </div>
      ) : ready ? (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--muted)] mb-2">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--muted)] mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      ) : (
        <div className="text-[var(--muted)]">Loading...</div>
      )}
    </main>
  )
}
