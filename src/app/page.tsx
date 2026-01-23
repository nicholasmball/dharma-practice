import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Decorative circle - like a zen ensō */}
      <div className="w-32 h-32 rounded-full border-2 border-[var(--accent)] opacity-60 mb-12" />

      <h1 className="text-4xl md:text-5xl font-light text-center mb-4 tracking-wide">
        Dharma Practice
      </h1>

      <p className="text-[var(--muted)] text-center max-w-md mb-12 text-lg">
        A quiet space for meditation, reflection, and the cultivation of awareness.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/login"
          className="px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors text-center min-w-[160px]"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-8 py-3 bg-[var(--surface)] text-[var(--foreground)] font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-center min-w-[160px]"
        >
          Create Account
        </Link>
      </div>

      <footer className="absolute bottom-8 text-[var(--muted)] text-sm">
        Rest in natural awareness
      </footer>
    </main>
  )
}
