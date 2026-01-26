import { createClient } from '@/lib/supabase/server'
import { MeditationSession, practiceTypeLabels, PracticeType } from '@/lib/types'
import StatsCharts from './StatsCharts'

export default async function StatsPage() {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('meditation_sessions')
    .select('*')
    .eq('completed', true)
    .order('started_at', { ascending: false })

  const allSessions = sessions || []

  // Calculate statistics
  const totalSessions = allSessions.length
  const totalSeconds = allSessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)

  // Time periods
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 30)

  const todaySessions = allSessions.filter(s => new Date(s.started_at) >= todayStart)
  const weekSessions = allSessions.filter(s => new Date(s.started_at) >= weekStart)
  const monthSessions = allSessions.filter(s => new Date(s.started_at) >= monthStart)

  const todayMinutes = Math.floor(todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)
  const weekMinutes = Math.floor(weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)
  const monthMinutes = Math.floor(monthSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(allSessions)

  // Practice type breakdown
  const practiceBreakdown = allSessions.reduce((acc, s) => {
    acc[s.practice_type] = (acc[s.practice_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Daily data for last 30 days (for chart)
  const dailyData = getLast30DaysData(allSessions)

  // Average session length
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

  // Calculate time since last sit
  const getTimeSinceLastSit = () => {
    if (allSessions.length === 0) {
      return { text: 'No sessions yet', isRecent: false, color: 'var(--muted)' }
    }

    const lastSession = allSessions[0] // Already sorted descending
    const lastEndTime = new Date(lastSession.ended_at || lastSession.started_at)
    const diffMs = now.getTime() - lastEndTime.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    let text: string
    let isRecent: boolean
    let color: string

    if (diffHours < 1) {
      text = 'Just now'
      isRecent = true
      color = 'var(--success)'
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours)
      text = `${hours} hour${hours === 1 ? '' : 's'} ago`
      isRecent = true
      color = 'var(--success)'
    } else if (diffDays < 2) {
      text = 'Yesterday'
      isRecent = true
      color = 'var(--success)'
    } else if (diffDays <= 2) {
      text = '2 days ago'
      isRecent = false
      color = 'var(--accent)'
    } else {
      const days = Math.floor(diffDays)
      text = `${days} days ago`
      isRecent = false
      color = days > 7 ? 'var(--error)' : 'var(--accent)'
    }

    return { text, isRecent, color }
  }

  const timeSinceLastSit = getTimeSinceLastSit()

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 300, marginBottom: '32px' }}>
        Practice Statistics
      </h1>

      {totalSessions === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
        }}>
          <p style={{ color: 'var(--muted)', marginBottom: '8px' }}>No meditation sessions recorded yet.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Complete your first session to see your statistics here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Time Since Last Sit - Prominent Card */}
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--surface)',
            borderRadius: '16px',
            border: `2px solid ${timeSinceLastSit.color}`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
              Last Practice
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 300, color: timeSinceLastSit.color }}>
              {timeSinceLastSit.text}
            </p>
          </div>

          {/* Time Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Today" value={`${todayMinutes}`} unit="min" />
            <StatCard label="This Week" value={`${weekMinutes}`} unit="min" />
            <StatCard label="This Month" value={`${monthMinutes}`} unit="min" />
            <StatCard label="All Time" value={totalHours > 0 ? `${totalHours}` : `${totalMinutes}`} unit={totalHours > 0 ? 'hrs' : 'min'} />
          </div>

          {/* Streak and Session Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Current Streak" value={`${currentStreak}`} unit="days" highlight />
            <StatCard label="Longest Streak" value={`${longestStreak}`} unit="days" />
            <StatCard label="Total Sessions" value={`${totalSessions}`} unit="sits" />
            <StatCard label="Avg Session" value={`${avgSessionMinutes}`} unit="min" />
          </div>

          {/* Charts Section */}
          <StatsCharts
            dailyData={dailyData}
            practiceBreakdown={practiceBreakdown}
            totalSessions={totalSessions}
          />

          {/* Recent Sessions */}
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '16px' }}>
              Recent Sessions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allSessions.slice(0, 10).map(session => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '10px',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, textTransform: 'capitalize', marginBottom: '2px' }}>
                      {session.practice_type}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    {Math.floor(session.duration_seconds / 60)} min
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'var(--surface)',
      borderRadius: '16px',
      border: highlight ? '2px solid var(--accent)' : '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--accent)' }}>{value}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
        {unit} · {label}
      </p>
    </div>
  )
}

function calculateStreaks(sessions: MeditationSession[]) {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Get unique dates with sessions
  const dates = new Set<string>()
  sessions.forEach(s => {
    const date = new Date(s.started_at)
    dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  })

  const sortedDates = Array.from(dates).map(d => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m, day)
  }).sort((a, b) => b.getTime() - a.getTime())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Current streak
  let currentStreak = 0
  const msPerDay = 24 * 60 * 60 * 1000

  if (sortedDates.length > 0) {
    const mostRecent = sortedDates[0]
    mostRecent.setHours(0, 0, 0, 0)

    if (mostRecent.getTime() === today.getTime() || mostRecent.getTime() === yesterday.getTime()) {
      currentStreak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = sortedDates[i - 1]
        const curr = sortedDates[i]
        prev.setHours(0, 0, 0, 0)
        curr.setHours(0, 0, 0, 0)
        if (prev.getTime() - curr.getTime() === msPerDay) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  // Longest streak
  let longestStreak = 0
  let tempStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]
    const curr = sortedDates[i]
    prev.setHours(0, 0, 0, 0)
    curr.setHours(0, 0, 0, 0)

    if (prev.getTime() - curr.getTime() === msPerDay) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return { currentStreak, longestStreak }
}

function getLast30DaysData(sessions: MeditationSession[]) {
  const data: { date: string; minutes: number; label: string }[] = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const daysSessions = sessions.filter(s => {
      const sessionDate = new Date(s.started_at)
      return sessionDate >= date && sessionDate < nextDate
    })

    const minutes = Math.floor(daysSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60)

    data.push({
      date: date.toISOString().split('T')[0],
      minutes,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })
  }

  return data
}
