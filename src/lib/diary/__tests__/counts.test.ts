import { describe, expect, it } from 'vitest'
import {
  countSessions,
  dateBadge,
  displayName,
  formatDayMonth,
  formatTimeRange,
  pastSessions,
  upcoming,
  waitingForWriteUp,
  writeUpDefaults,
} from '../counts'
import { row } from './fixtures'

const now = new Date('2026-11-18T15:00:00Z')

describe('countSessions', () => {
  it('counts only sessions that have ended, were not cancelled or removed, and did happen', () => {
    const rows = [
      row({ starts_at: '2026-11-10T16:00:00Z', ends_at: '2026-11-10T16:55:00Z' }), // counts
      row({ starts_at: '2026-11-18T16:00:00Z', ends_at: '2026-11-18T16:55:00Z' }), // later today: not yet
      row({ starts_at: '2026-11-11T16:00:00Z', ends_at: '2026-11-11T16:55:00Z', status: 'cancelled' }),
      row({ starts_at: '2026-11-12T16:00:00Z', ends_at: '2026-11-12T16:55:00Z', status: 'removed' }),
      row({ starts_at: '2026-11-13T16:00:00Z', ends_at: '2026-11-13T16:55:00Z', skipped: true }),
    ]
    const counts = countSessions(rows, now)
    expect(counts.month).toBe(1)
    expect(counts.year).toBe(1)
    expect(counts.allTime).toBe(1)
  })

  it('splits month, year and all time', () => {
    const rows = [
      row({ starts_at: '2026-11-02T16:00:00Z', ends_at: '2026-11-02T17:00:00Z' }),
      row({ starts_at: '2026-03-02T16:00:00Z', ends_at: '2026-03-02T17:00:00Z' }),
      row({ starts_at: '2018-05-02T16:00:00Z', ends_at: '2018-05-02T17:00:00Z' }),
    ]
    expect(countSessions(rows, now)).toMatchObject({ month: 1, year: 2, allTime: 3 })
  })

  it('counts a session crossing midnight at the end of a month in the month it started (UK time)', () => {
    // Starts 23:30 UK time on 31 Oct (GMT), ends 00:30 on 1 Nov.
    const rows = [row({ starts_at: '2026-10-31T23:30:00Z', ends_at: '2026-11-01T00:30:00Z' })]
    expect(countSessions(rows, new Date('2026-11-05T12:00:00Z')).month).toBe(0)
    expect(countSessions(rows, new Date('2026-10-31T23:59:00Z')).month).toBe(0) // not ended yet
    expect(countSessions(rows, new Date('2026-11-05T12:00:00Z')).year).toBe(1)
  })

  it('uses UK time, not UTC, to place a session in a month (summer time)', () => {
    // 23:30 UTC on 31 Jul is 00:30 on 1 Aug in the UK (BST).
    const rows = [row({ starts_at: '2026-07-31T23:30:00Z', ends_at: '2026-08-01T00:15:00Z' })]
    expect(countSessions(rows, new Date('2026-08-10T12:00:00Z')).month).toBe(1)
  })

  it('counts per teacher, this year and all time, with the next session for each', () => {
    const rows = [
      row({ teacher: 'Michael Taft', starts_at: '2026-11-02T16:00:00Z', ends_at: '2026-11-02T17:00:00Z' }),
      row({ teacher: 'Michael Taft', starts_at: '2019-11-02T16:00:00Z', ends_at: '2019-11-02T17:00:00Z' }),
      row({ teacher: 'Vince Horn', kind: 'mentoring', starts_at: '2026-12-03T14:00:00Z', ends_at: '2026-12-03T14:45:00Z' }),
    ]
    const { perTeacher } = countSessions(rows, now)
    expect(perTeacher).toEqual([
      { teacher: 'Michael Taft', kind: 'coaching', year: 1, allTime: 2, next: null },
      { teacher: 'Vince Horn', kind: 'mentoring', year: 0, allTime: 0, next: '2026-12-03T14:00:00Z' },
    ])
  })
})

describe('per-teacher order', () => {
  it('puts teachers with equal counts in order of their next session', () => {
    const rows = [
      row({ teacher: 'Emily Horn', kind: 'training_1to1', starts_at: '2027-01-14T18:00:00Z', ends_at: '2027-01-14T18:45:00Z' }),
      row({ teacher: 'Vince Horn', kind: 'mentoring', starts_at: '2026-12-03T14:00:00Z', ends_at: '2026-12-03T14:45:00Z' }),
    ]
    expect(countSessions(rows, now).perTeacher.map((t) => t.teacher)).toEqual(['Vince Horn', 'Emily Horn'])
  })
})

describe('waitingForWriteUp', () => {
  it('lists sessions that ended in the last 14 days with no write-up, newest first', () => {
    const older = row({ starts_at: '2026-11-06T17:00:00Z', ends_at: '2026-11-06T18:00:00Z' })
    const newer = row({ starts_at: '2026-11-13T17:00:00Z', ends_at: '2026-11-13T18:00:00Z' })
    expect(waitingForWriteUp([older, newer], now).map((r) => r.id)).toEqual([newer.id, older.id])
  })

  it('leaves out written-up, dismissed, skipped, cancelled, upcoming and old sessions', () => {
    const base = { starts_at: '2026-11-13T17:00:00Z', ends_at: '2026-11-13T18:00:00Z' }
    const rows = [
      row({ ...base, journal_entry_id: 'j1' }),
      row({ ...base, writeup_dismissed: true }),
      row({ ...base, skipped: true }),
      row({ ...base, status: 'cancelled' }),
      row({ ...base, status: 'removed' }),
      row({ starts_at: '2026-11-18T16:00:00Z', ends_at: '2026-11-18T17:00:00Z' }),
      row({ starts_at: '2026-11-03T17:00:00Z', ends_at: '2026-11-03T18:00:00Z' }), // 15 days ago
    ]
    expect(waitingForWriteUp(rows, now)).toEqual([])
  })
})

describe('upcoming and pastSessions', () => {
  it('lists upcoming scheduled sessions soonest first', () => {
    const a = row({ starts_at: '2026-12-10T16:00:00Z', ends_at: '2026-12-10T16:55:00Z' })
    const b = row({ starts_at: '2026-12-03T14:00:00Z', ends_at: '2026-12-03T14:45:00Z' })
    const gone = row({ starts_at: '2026-12-05T14:00:00Z', ends_at: '2026-12-05T14:45:00Z', status: 'removed' })
    const cancelled = row({ starts_at: '2026-12-06T14:00:00Z', ends_at: '2026-12-06T14:45:00Z', status: 'cancelled' })
    expect(upcoming([a, b, gone, cancelled], now).map((r) => r.id)).toEqual([b.id, a.id])
  })

  it('lists past sessions newest first, keeping skipped ones (so they can be undone)', () => {
    const a = row({ starts_at: '2026-07-10T15:00:00Z', ends_at: '2026-07-10T15:55:00Z', skipped: true })
    const b = row({ starts_at: '2026-09-03T15:00:00Z', ends_at: '2026-09-03T15:55:00Z' })
    const gone = row({ starts_at: '2026-09-04T15:00:00Z', ends_at: '2026-09-04T15:55:00Z', status: 'removed' })
    expect(pastSessions([a, b, gone], now).map((r) => r.id)).toEqual([b.id, a.id])
  })
})

describe('writeUpDefaults and display', () => {
  it('uses the design\'s short month names', () => {
    expect(dateBadge('2026-09-03T15:00:00Z')).toEqual({ day: '3', month: 'Sep' })
    expect(formatDayMonth('2026-09-03T15:00:00Z')).toBe('Thu 3 Sep')
  })

  it('titles a one-to-one with the teacher and tags it', () => {
    const r = row({ teacher: 'Michael Taft', starts_at: '2026-12-10T16:00:00Z', ends_at: '2026-12-10T16:55:00Z' })
    expect(writeUpDefaults(r)).toEqual({
      title: 'Michael Taft - Dec 10, 2026',
      tags: ['teacher session', 'michael taft'],
      intro: 'For your session: Michael Taft · Thu 10 Dec',
    })
  })

  it('titles the group as teacher training', () => {
    const r = row({ teacher: 'Pragmatic Dharma', kind: 'group', starts_at: '2026-11-13T17:00:00Z', ends_at: '2026-11-13T18:00:00Z' })
    expect(writeUpDefaults(r)).toEqual({
      title: 'Teacher training - Nov 13, 2026',
      tags: ['teacher session', 'pragmatic dharma'],
      intro: 'For your session: Pragmatic Dharma teacher training · Fri 13 Nov',
    })
    expect(displayName(r)).toBe('Pragmatic Dharma teacher training')
  })

  it('uses the UK date for a late-evening US session', () => {
    // 00:30 UTC on 15 Jan is still 14 Jan in New York, but the app shows UK dates.
    const r = row({ teacher: 'Emily Horn', kind: 'training_1to1', starts_at: '2027-01-15T00:30:00Z', ends_at: '2027-01-15T01:15:00Z' })
    expect(writeUpDefaults(r).title).toBe('Emily Horn - Jan 15, 2027')
  })

  it('formats time ranges in UK time', () => {
    expect(formatTimeRange('2026-11-13T17:00:00Z', '2026-11-13T18:00:00Z')).toBe('5:00–6:00pm')
    expect(formatTimeRange('2026-12-03T14:00:00Z', '2026-12-03T14:45:00Z')).toBe('2:00–2:45pm')
    expect(formatTimeRange('2026-12-03T11:30:00Z', '2026-12-03T12:30:00Z')).toBe('11:30am–12:30pm')
    expect(formatTimeRange('2026-12-03T00:00:00Z', '2026-12-03T00:45:00Z')).toBe('12:00–12:45am')
    // Summer time: 16:00 UTC is 5pm in the UK.
    expect(formatTimeRange('2026-07-10T16:00:00Z', '2026-07-10T16:55:00Z')).toBe('5:00–5:55pm')
    // Compact form for phones drops ":00".
    expect(formatTimeRange('2026-11-13T17:00:00Z', '2026-11-13T18:00:00Z', true)).toBe('5–6pm')
    expect(formatTimeRange('2026-12-03T14:00:00Z', '2026-12-03T14:45:00Z', true)).toBe('2–2:45pm')
  })
})
