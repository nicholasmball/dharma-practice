import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24">
        {/* Decorative circle - like a zen ensō */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-[var(--accent)] opacity-60 mb-8" />

        <h1 className="text-4xl md:text-5xl font-light text-center mb-4 tracking-wide">
          balladharma
        </h1>

        <p className="text-[var(--muted)] text-center max-w-lg mb-8 text-lg leading-relaxed">
          A quiet space for meditation, reflection, and the cultivation of awareness.
          Track your practice, journal your insights, and deepen your understanding.
        </p>

        <Link
          href="/signup"
          className="px-10 py-4 bg-[var(--accent)] text-[var(--background)] font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors text-center text-lg mb-4"
        >
          Start Your Practice
        </Link>

        <p className="text-[var(--muted)] text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </section>

      {/* Features Section */}
      <section className="px-6 py-12 md:py-16 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-center mb-12">
            Everything you need for your practice
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timer Feature */}
            <div className="p-6 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-4">
                <span className="text-xl text-[var(--accent)]">◯</span>
              </div>
              <h3 className="text-lg font-medium mb-2">Meditation Timer</h3>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                Timed sessions with interval bells and singing bowl sounds.
                Track shamatha, vipashyana, Mahamudra, or Dzogchen practice.
              </p>
            </div>

            {/* Journal Feature */}
            <div className="p-6 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-4">
                <span className="text-xl text-[var(--accent)]">✎</span>
              </div>
              <h3 className="text-lg font-medium mb-2">Practice Journal</h3>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                Record insights, experiences, and reflections.
                Tag entries and track patterns in your practice over time.
              </p>
            </div>

            {/* AI Teacher Feature */}
            <div className="p-6 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-4">
                <span className="text-xl text-[var(--accent)]">◈</span>
              </div>
              <h3 className="text-lg font-medium mb-2">AI Meditation Teacher</h3>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                Get personalized guidance from an AI trained in Buddhist meditation traditions.
                Ask questions and receive thoughtful responses.
              </p>
            </div>

            {/* Stats Feature */}
            <div className="p-6 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] flex items-center justify-center mb-4">
                <span className="text-xl text-[var(--accent)]">◫</span>
              </div>
              <h3 className="text-lg font-medium mb-2">Practice Statistics</h3>
              <p className="text-[var(--muted)] text-sm leading-relaxed">
                Visualize your practice with streaks, session history, and insights.
                See your progress over days, weeks, and months.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 text-center">
        <p className="text-[var(--muted)] mb-6 text-lg">
          Free to use. No ads. Just practice.
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
        >
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--muted)] text-sm border-t border-[var(--border)]">
        Rest in natural awareness
      </footer>
    </main>
  )
}
