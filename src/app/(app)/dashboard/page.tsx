import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user
  const { data: { user } } = await supabase.auth.getUser()

  // Get recent sessions
  const { data: recentSessions } = await supabase
    .from('meditation_sessions')
    .select('*')
    .eq('completed', true)
    .order('started_at', { ascending: false })
    .limit(5)

  // Get total sessions count
  const { count: totalSessions } = await supabase
    .from('meditation_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)

  // Get total meditation time
  const { data: timeData } = await supabase
    .from('meditation_sessions')
    .select('duration_seconds')
    .eq('completed', true)

  const totalMinutes = timeData
    ? Math.floor(timeData.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)
    : 0

  // Get journal entries count (for onboarding)
  const { count: journalCount } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })

  // Get teacher conversations count (for onboarding)
  const { count: conversationCount } = await supabase
    .from('teacher_conversations')
    .select('*', { count: 'exact', head: true })

  // Calculate streak (consecutive days)
  let currentStreak = 0
  if (recentSessions && recentSessions.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessionDates = recentSessions.map(s => {
      const date = new Date(s.started_at)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    })

    // Get unique dates
    const uniqueDates = [...new Set(sessionDates)].sort((a, b) => b - a)

    // Check if practiced today or yesterday
    const msPerDay = 24 * 60 * 60 * 1000
    const todayMs = today.getTime()
    const yesterdayMs = todayMs - msPerDay

    if (uniqueDates[0] === todayMs || uniqueDates[0] === yesterdayMs) {
      currentStreak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i - 1] - uniqueDates[i] === msPerDay) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  const greeting = getGreeting()

  // Onboarding progress
  const hasCompletedMeditation = (totalSessions || 0) > 0
  const hasJournaled = (journalCount || 0) > 0
  const hasAskedTeacher = (conversationCount || 0) > 0
  const onboardingComplete = hasCompletedMeditation && hasJournaled && hasAskedTeacher
  const isNewUser = !onboardingComplete

  // Determine next action for CTA
  const getNextAction = () => {
    if (!hasCompletedMeditation) return { href: '/timer', label: 'Begin Your First Sit' }
    if (!hasJournaled) return { href: '/journal/new', label: 'Write Your First Journal Entry' }
    return { href: '/teacher', label: 'Ask the Teacher a Question' }
  }
  const nextAction = getNextAction()

  // New user onboarding view
  if (isNewUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '600px' }}>
        {/* Welcome Header */}
        <div style={{ textAlign: 'center', paddingTop: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <span style={{ fontSize: '2rem', color: 'var(--accent)' }}>◯</span>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '12px' }}>
            {hasCompletedMeditation ? 'Welcome Back' : 'Welcome to Dharma Practice'}
          </h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            {hasCompletedMeditation
              ? 'Complete the steps below to finish setting up your practice.'
              : 'A quiet space for meditation, reflection, and cultivating awareness. Let\'s get you started on your practice journey.'}
          </p>
        </div>

        {/* Getting Started Steps */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '20px' }}>
            Getting Started
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Step 1 - Meditation */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: hasCompletedMeditation ? 'var(--success)' : 'var(--accent)',
                color: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                flexShrink: 0,
              }}>{hasCompletedMeditation ? '✓' : '1'}</div>
              <div style={{ opacity: hasCompletedMeditation ? 0.6 : 1 }}>
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                  Start your first meditation
                  {hasCompletedMeditation && <span style={{ color: 'var(--success)', marginLeft: '8px', fontSize: '0.875rem' }}>Complete</span>}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Use the timer to guide your practice. Choose a duration and practice type that feels right.
                </p>
              </div>
            </div>

            {/* Step 2 - Journal */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: hasJournaled ? 'var(--success)' : (hasCompletedMeditation ? 'var(--accent)' : 'var(--background)'),
                border: hasJournaled || hasCompletedMeditation ? 'none' : '2px solid var(--border)',
                color: hasJournaled || hasCompletedMeditation ? 'var(--background)' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                flexShrink: 0,
              }}>{hasJournaled ? '✓' : '2'}</div>
              <div style={{ opacity: hasJournaled ? 0.6 : 1 }}>
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                  Journal your experience
                  {hasJournaled && <span style={{ color: 'var(--success)', marginLeft: '8px', fontSize: '0.875rem' }}>Complete</span>}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  After sitting, note any insights or observations. This helps deepen your practice over time.
                </p>
              </div>
            </div>

            {/* Step 3 - Teacher */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: hasAskedTeacher ? 'var(--success)' : (hasJournaled ? 'var(--accent)' : 'var(--background)'),
                border: hasAskedTeacher || hasJournaled ? 'none' : '2px solid var(--border)',
                color: hasAskedTeacher || hasJournaled ? 'var(--background)' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                flexShrink: 0,
              }}>{hasAskedTeacher ? '✓' : '3'}</div>
              <div style={{ opacity: hasAskedTeacher ? 0.6 : 1 }}>
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                  Ask the teacher
                  {hasAskedTeacher && <span style={{ color: 'var(--success)', marginLeft: '8px', fontSize: '0.875rem' }}>Complete</span>}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Have questions about meditation? The AI teacher can offer guidance on technique and tradition.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action */}
        <Link
          href={nextAction.href}
          style={{
            display: 'block',
            padding: '18px 24px',
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            borderRadius: '12px',
            textDecoration: 'none',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.125rem',
          }}
        >
          {nextAction.label}
        </Link>

        {/* Secondary Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <Link
            href="/settings"
            style={{
              padding: '14px 20px',
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              color: 'var(--foreground)',
              textAlign: 'center',
              fontSize: '0.875rem',
            }}
          >
            Set Defaults
          </Link>
          <Link
            href="/stats"
            style={{
              padding: '14px 20px',
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              color: 'var(--foreground)',
              textAlign: 'center',
              fontSize: '0.875rem',
            }}
          >
            View Stats
          </Link>
        </div>

        {/* Tip */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--accent)',
          borderLeftWidth: '3px',
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Tip:</strong> Start with just 10 minutes.
            Consistency matters more than duration. Even a short daily sit builds a strong foundation.
          </p>
        </div>
      </div>
    )
  }

  // Regular dashboard for returning users
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '8px' }}>{greeting}</h1>
        <p style={{ color: 'var(--muted)' }}>
          {`You've completed ${totalSessions} ${totalSessions === 1 ? 'session' : 'sessions'}.`}
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <Link
          href="/timer"
          style={{
            padding: '24px',
            backgroundColor: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>◯</span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '4px' }}>Begin Meditation</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Start a timed practice session</p>
        </Link>

        <Link
          href="/journal"
          style={{
            padding: '24px',
            backgroundColor: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>✎</span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '4px' }}>Write in Journal</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Record insights and experiences</p>
        </Link>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '1.875rem', fontWeight: 300, color: 'var(--accent)' }}>{totalSessions || 0}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '4px' }}>Total Sits</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '1.875rem', fontWeight: 300, color: 'var(--accent)' }}>{totalMinutes}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '4px' }}>Minutes</p>
        </div>
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '1.875rem', fontWeight: 300, color: 'var(--accent)' }}>{currentStreak}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '4px' }}>Day Streak</p>
        </div>
      </div>

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '16px' }}>Recent Practice</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSessions.map((session) => (
              <div
                key={session.id}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{session.practice_type}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    {new Date(session.started_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <p style={{ color: 'var(--accent)' }}>
                  {Math.floor(session.duration_seconds / 60)} min
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/stats"
            style={{ display: 'block', textAlign: 'center', fontSize: '0.875rem', color: 'var(--accent)', marginTop: '16px' }}
          >
            View all statistics →
          </Link>
        </div>
      )}
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
