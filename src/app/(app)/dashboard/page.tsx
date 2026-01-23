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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '8px' }}>{greeting}</h1>
        <p style={{ color: 'var(--muted)' }}>
          {totalSessions === 0
            ? 'Begin your practice journey today.'
            : `You've completed ${totalSessions} ${totalSessions === 1 ? 'session' : 'sessions'}.`}
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
