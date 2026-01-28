'use client'

import { useMemo } from 'react'
import { practiceTypeLabels, PracticeType } from '@/lib/types'

const PRACTICE_COLORS: Record<PracticeType, string> = {
  shamatha: '#c9a84c',
  vipashyana: '#7cb3a8',
  mahamudra: '#a87cb3',
  dzogchen: '#7c9eb3',
  other: '#8b92a5',
}

interface StatsChartsProps {
  dailyData: { date: string; minutes: number; label: string }[]
  practiceBreakdown: Record<string, number>
  totalSessions: number
}

export default function StatsCharts({ dailyData, practiceBreakdown, totalSessions }: StatsChartsProps) {
  // Memoize calculations to avoid recalculating on every render
  const maxMinutes = useMemo(() => Math.max(...dailyData.map(d => d.minutes), 1), [dailyData])

  const sortedBreakdown = useMemo(() =>
    Object.entries(practiceBreakdown).sort((a, b) => b[1] - a[1]),
    [practiceBreakdown]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 md:gap-4">
      {/* Daily Practice Chart */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '20px' }}>
          Last 30 Days
        </h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '160px' }}>
          {dailyData.map((day, index) => (
            <div
              key={day.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
              title={`${day.label}: ${day.minutes} min`}
            >
              <div
                style={{
                  width: '100%',
                  backgroundColor: day.minutes > 0 ? 'var(--accent)' : 'var(--border)',
                  borderRadius: '2px 2px 0 0',
                  height: day.minutes > 0 ? `${(day.minutes / maxMinutes) * 100}%` : '4px',
                  minHeight: '4px',
                  transition: 'height 0.3s ease',
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {dailyData[0]?.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {dailyData[dailyData.length - 1]?.label}
          </span>
        </div>
      </div>

      {/* Practice Type Breakdown */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '24px',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '20px' }}>
          Practice Types
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedBreakdown.map(([type, count]) => {
              const percentage = Math.round((count / totalSessions) * 100)
              const color = PRACTICE_COLORS[type as PracticeType] || PRACTICE_COLORS.other
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                      {type}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
