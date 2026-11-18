import type { DiaryKind, DiarySession } from './types'

// Pure helpers for the Diary: counts, the "waiting for your write-up" rule,
// list ordering and the wording shown for each session. Everything is shown
// and counted in UK time, whatever zone the calendar event was made in.

export const DIARY_TZ = 'Europe/London'
export const WRITE_UP_WINDOW_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

type Row = Pick<
  DiarySession,
  'teacher' | 'kind' | 'starts_at' | 'ends_at' | 'status' | 'skipped' | 'journal_entry_id' | 'writeup_dismissed'
>

// en-US gives the short month names the design uses ("Sep", not "Sept").
// Only the separate parts are used, so the US ordering never shows.
function parts(iso: string | Date, options: Intl.DateTimeFormatOptions, tz = DIARY_TZ) {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const result: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options }).formatToParts(date)) {
    result[part.type] = part.value
  }
  return result
}

/** "2026-11" for the UK month a moment falls in. */
export function monthKey(iso: string | Date, tz = DIARY_TZ): string {
  const p = parts(iso, { year: 'numeric', month: '2-digit' }, tz)
  return `${p.year}-${p.month}`
}

/** "2026-11-13" for the UK day a moment falls in. */
export function dayKey(iso: string | Date, tz = DIARY_TZ): string {
  const p = parts(iso, { year: 'numeric', month: '2-digit', day: '2-digit' }, tz)
  return `${p.year}-${p.month}-${p.day}`
}

/** A session counts once it has ended, was not cancelled or removed, and was not marked "didn't happen". */
export function hasHappened(row: Row, now: Date): boolean {
  return row.status === 'scheduled' && !row.skipped && Date.parse(row.ends_at) <= now.getTime()
}

export interface TeacherCount {
  teacher: string
  kind: DiaryKind
  year: number
  allTime: number
  next: string | null
}

export interface DiaryCounts {
  month: number
  year: number
  allTime: number
  perTeacher: TeacherCount[]
}

export function countSessions(rows: Row[], now: Date, tz = DIARY_TZ): DiaryCounts {
  const thisMonth = monthKey(now, tz)
  const thisYear = thisMonth.slice(0, 4)
  const counts: DiaryCounts = { month: 0, year: 0, allTime: 0, perTeacher: [] }
  const byTeacher = new Map<string, TeacherCount>()

  for (const row of rows) {
    if (row.status !== 'scheduled') continue
    let teacher = byTeacher.get(row.teacher)
    if (!teacher) {
      teacher = { teacher: row.teacher, kind: row.kind, year: 0, allTime: 0, next: null }
      byTeacher.set(row.teacher, teacher)
    }
    if (Date.parse(row.starts_at) > now.getTime()) {
      if (!teacher.next || Date.parse(row.starts_at) < Date.parse(teacher.next)) teacher.next = row.starts_at
    }
    if (!hasHappened(row, now)) continue
    const key = monthKey(row.starts_at, tz)
    counts.allTime += 1
    teacher.allTime += 1
    if (key.startsWith(thisYear)) {
      counts.year += 1
      teacher.year += 1
    }
    if (key === thisMonth) counts.month += 1
  }

  counts.perTeacher = [...byTeacher.values()].sort(
    (a, b) =>
      b.allTime - a.allTime ||
      b.year - a.year ||
      nextOrder(a.next) - nextOrder(b.next) ||
      a.teacher.localeCompare(b.teacher)
  )
  return counts
}

function nextOrder(next: string | null): number {
  return next ? Date.parse(next) : Number.MAX_SAFE_INTEGER
}

export function waitingForWriteUp<T extends Row>(rows: T[], now: Date): T[] {
  const since = now.getTime() - WRITE_UP_WINDOW_DAYS * DAY_MS
  return rows
    .filter((row) => {
      const end = Date.parse(row.ends_at)
      return (
        hasHappened(row, now) && end > since && !row.journal_entry_id && !row.writeup_dismissed
      )
    })
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
}

export function upcoming<T extends Row>(rows: T[], now: Date): T[] {
  return rows
    .filter((row) => row.status === 'scheduled' && Date.parse(row.ends_at) > now.getTime())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
}

/** Past sessions to list, newest first. Skipped ones stay so "didn't happen" can be undone. */
export function pastSessions<T extends Row>(rows: T[], now: Date): T[] {
  return rows
    .filter((row) => row.status === 'scheduled' && Date.parse(row.ends_at) <= now.getTime())
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
}

// ---- Wording ---------------------------------------------------------------

export function displayName(row: Pick<Row, 'teacher' | 'kind'>): string {
  return row.kind === 'group' ? `${row.teacher} teacher training` : row.teacher
}

/** Shorter name for a phone list: "PD teacher training" for the group. */
export function shortDisplayName(row: Pick<Row, 'teacher' | 'kind'>): string {
  if (row.kind !== 'group') return row.teacher
  return `${initials(row.teacher)} teacher training`
}

/** Tiny label for a month-grid cell: "Michael", "PD training". */
export function pipLabel(row: Pick<Row, 'teacher' | 'kind'>): string {
  if (row.kind === 'group') return `${initials(row.teacher)} training`
  return row.teacher.split(/\s+/)[0]
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  return words.length > 1 ? words.map((w) => w[0].toUpperCase()).join('') : name
}

/** "Fri 13 Nov" */
export function formatDayMonth(iso: string): string {
  const p = parts(iso, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${p.weekday} ${p.day} ${p.month}`
}

/** "Fri" */
export function formatWeekday(iso: string): string {
  return parts(iso, { weekday: 'short' }).weekday
}

/** "13" and "Nov" for the date badge. */
export function dateBadge(iso: string): { day: string; month: string } {
  const p = parts(iso, { day: 'numeric', month: 'short' })
  return { day: p.day, month: p.month }
}

function clock(iso: string): { text: string; period: 'am' | 'pm' } {
  const p = parts(iso, { hour: 'numeric', minute: '2-digit', hour12: false })
  const hour24 = Number(p.hour) % 24
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { text: `${hour12}:${p.minute}`, period: hour24 < 12 ? 'am' : 'pm' }
}

/**
 * "5:00–6:00pm", or "11:30am–12:30pm" when the two ends differ.
 * `compact` drops ":00" from on-the-hour times ("5–6pm") for narrow screens.
 */
export function formatTimeRange(startIso: string, endIso: string, compact = false): string {
  const tidy = (c: { text: string; period: 'am' | 'pm' }) =>
    compact ? { ...c, text: c.text.replace(/:00$/, '') } : c
  const start = tidy(clock(startIso))
  const end = tidy(clock(endIso))
  return start.period === end.period
    ? `${start.text}–${end.text}${end.period}`
    : `${start.text}${start.period}–${end.text}${end.period}`
}

export function writeUpDefaults(row: Pick<Row, 'teacher' | 'kind' | 'starts_at'>): {
  title: string
  tags: string[]
  intro: string
} {
  const p = parts(row.starts_at, { year: 'numeric', month: 'short', day: 'numeric' })
  const label = row.kind === 'group' ? 'Teacher training' : row.teacher
  return {
    title: `${label} - ${p.month} ${p.day}, ${p.year}`,
    tags: ['teacher session', row.teacher.trim().toLowerCase()],
    intro: `For your session: ${displayName(row)} · ${formatDayMonth(row.starts_at)}`,
  }
}

/** Whole days from `now` to the start of the session, by UK calendar day. */
export function daysUntil(iso: string, now: Date): number {
  const a = Date.parse(`${dayKey(iso)}T00:00:00Z`)
  const b = Date.parse(`${dayKey(now)}T00:00:00Z`)
  return Math.round((a - b) / DAY_MS)
}

/** "3 minutes ago", "2 hours ago", "4 days ago". */
export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Link targets that Balla Bot's stage-2 messages will also use. */
export function writeUpHref(sourceId: string): string {
  return `/journal/new?diary=${encodeURIComponent(sourceId)}`
}

export function sitHref(sourceId: string): string {
  return `/timer?diary=${encodeURIComponent(sourceId)}`
}
