'use client'

import { useMemo, useState, useTransition, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DiarySession } from '@/lib/types'
import type { SyncResult } from '@/lib/diary/sync'
import { KIND_LABELS } from '@/lib/diary/types'
import {
  countSessions,
  dateBadge,
  dayKey,
  daysUntil,
  displayName,
  formatDayMonth,
  formatTimeRange,
  formatWeekday,
  pastSessions,
  pipLabel,
  shortDisplayName,
  sitHref,
  timeAgo,
  upcoming,
  waitingForWriteUp,
  writeUpHref,
} from '@/lib/diary/counts'
import { setSkipped, setWriteUpDismissed } from './actions'

export type DiaryRow = DiarySession & { sit_seconds: number | null }

interface DiaryClientProps {
  rows: DiaryRow[]
  now: string
  sync: SyncResult
  loadFailed: boolean
  linkFailed: 'entry' | 'sit' | null
}

const PAST_PREVIEW = 3

// ---- Shared styles (same values the other pages use inline) ----------------

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '20px',
}
const rowCard: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '16px',
}
const h2: CSSProperties = { fontSize: '1.125rem', fontWeight: 500, margin: '0 0 16px' }
const meta: CSSProperties = { fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }
const who: CSSProperties = { fontWeight: 500, margin: 0 }
const linkStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--accent)',
  textDecoration: 'none',
  background: 'none',
  border: 0,
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
}
const btn: CSSProperties = {
  padding: '8px 14px',
  borderRadius: '10px',
  fontSize: '0.875rem',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--foreground)',
  textDecoration: 'none',
  cursor: 'pointer',
  lineHeight: 1.6,
}
const btnPrimary: CSSProperties = {
  ...btn,
  background: 'var(--accent)',
  color: 'var(--background)',
  borderColor: 'var(--accent)',
  fontWeight: 600,
}
const btnQuiet: CSSProperties = {
  ...btn,
  color: 'var(--muted)',
  borderColor: 'transparent',
  paddingLeft: '6px',
  paddingRight: '6px',
}

export default function DiaryClient({ rows, now: nowIso, sync, loadFailed, linkFailed }: DiaryClientProps) {
  const router = useRouter()
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [view, setView] = useState<'list' | 'month'>('list')
  const [showAllPast, setShowAllPast] = useState(false)
  const [refreshing, startRefresh] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const counts = useMemo(() => countSessions(rows, now), [rows, now])
  const waiting = useMemo(() => waitingForWriteUp(rows, now), [rows, now])
  const coming = useMemo(() => upcoming(rows, now), [rows, now])
  const waitingIds = new Set(waiting.map((r) => r.id))
  const past = useMemo(() => pastSessions(rows, now), [rows, now]).filter((r) => !waitingIds.has(r.id))
  const shownPast = showAllPast ? past : past.slice(0, PAST_PREVIEW)

  const refresh = () => startRefresh(() => router.refresh())

  const runAction = async (id: string, action: () => Promise<{ success: true } | { error: string }>) => {
    setBusyId(id)
    setActionError(null)
    try {
      const result = await action()
      if ('error' in result) setActionError(`Couldn't save that change: ${result.error}`)
      else router.refresh()
    } catch {
      // The request itself failed (offline, server down): say so, and free the buttons.
      setActionError("Couldn't save that change. Check your connection and try again.")
    } finally {
      setBusyId(null)
    }
  }

  const footer = (
    <>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span>
          {sync.lastSuccessAt
            ? `Updated ${timeAgo(sync.lastSuccessAt, now)} from your Google Calendar via Balla Bot`
            : 'Not yet updated from your Google Calendar'}
        </span>
        <button type="button" onClick={refresh} disabled={refreshing} style={{ ...btn, padding: '4px 10px' }}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p style={{ ...meta, fontSize: '0.8rem' }}>
        Reminders before and after sessions come from Balla Bot on Telegram. To change them, ask Balla Bot.
      </p>
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }} className="gap-5 md:gap-7">
      <div>
        <h1 className="text-[1.6rem] md:text-[1.875rem]" style={{ fontWeight: 300, margin: '0 0 8px' }}>
          Diary
        </h1>
        <p className="text-[0.9rem] md:text-base" style={{ color: 'var(--muted)', margin: 0 }}>
          <span className="md:hidden">Your sessions with your teachers.</span>
          <span className="hidden md:inline">Your sessions with your teachers, from your Google Calendar.</span>
        </p>
      </div>

      <Notices
        sync={sync}
        now={now}
        loadFailed={loadFailed}
        linkFailed={linkFailed}
        actionError={actionError}
        onRetry={refresh}
        retrying={refreshing}
      />

      {rows.length === 0 && !loadFailed ? (
        <>
          <div style={{ ...card, padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid var(--accent)',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                fontSize: '1.4rem',
              }}
            >
              ▦
            </div>
            <p style={who}>No sessions yet</p>
            <p style={meta}>Sessions with your teachers will appear here once they&apos;re in your Google Calendar.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>{footer}</div>
        </>
      ) : rows.length === 0 ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }} className="gap-2 md:gap-4">
            <StatTile value={counts.month} label={<><span className="md:hidden">This month</span><span className="hidden md:inline">Sessions this month</span></>} />
            <StatTile value={counts.year} label="This year" />
            <StatTile value={counts.allTime} label="All time" />
          </div>

          {waiting.map((row) => (
            <WaitingCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onDismiss={() => runAction(row.id, () => setWriteUpDismissed(row.id, true))}
              onSkip={() => runAction(row.id, () => setSkipped(row.id, true))}
            />
          ))}

          {/* Phone and narrow screens: switch between the list and the month grid */}
          <div
            className="inline-flex min-[900px]:hidden"
            style={{ alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}
            role="tablist"
          >
            {(['list', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.875rem',
                  border: 0,
                  cursor: 'pointer',
                  background: view === v ? 'var(--surface-hover)' : 'transparent',
                  color: view === v ? 'var(--foreground)' : 'var(--muted)',
                }}
              >
                {v === 'list' ? 'List' : 'Month'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 min-[900px]:grid-cols-[1.35fr_1fr] gap-6 items-start">
            {/* Left: coming up + past */}
            <div className={`${view === 'month' ? 'hidden min-[900px]:flex' : 'flex'} flex-col gap-6 min-w-0`}>
              <section>
                <h2 style={h2}>Coming up</h2>
                {coming.length === 0 ? (
                  <p style={meta}>Nothing booked yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {coming.map((row, index) => (
                      <UpcomingRow key={row.id} row={row} now={now} first={index === 0} />
                    ))}
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section>
                  <h2 style={h2}>Past sessions</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {shownPast.map((row) => (
                      <PastRow
                        key={row.id}
                        row={row}
                        busy={busyId === row.id}
                        onUndoSkip={() => runAction(row.id, () => setSkipped(row.id, false))}
                        onUndoDismiss={() => runAction(row.id, () => setWriteUpDismissed(row.id, false))}
                      />
                    ))}
                  </div>
                  {past.length > PAST_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAllPast(!showAllPast)}
                      style={{ ...linkStyle, display: 'block', margin: '16px auto 0' }}
                    >
                      {showAllPast ? 'Show fewer' : `Show all ${past.length} past sessions →`}
                    </button>
                  )}
                </section>
              )}
            </div>

            {/* Right: month grid + per-teacher counts */}
            <div className={`${view === 'list' ? 'hidden min-[900px]:flex' : 'flex'} flex-col gap-6 min-w-0`}>
              <MonthGrid rows={rows} now={now} />
              <div style={card}>
                <h2 style={{ ...h2, marginBottom: '4px' }}>Sessions by teacher</h2>
                <p style={{ ...meta, marginBottom: '8px' }}>Sessions that have happened · this year / all time</p>
                {counts.perTeacher.map((t, i) => (
                  <div
                    key={t.teacher}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: i === counts.perTeacher.length - 1 ? 0 : '1px solid var(--border)',
                    }}
                  >
                    <span>{t.kind === 'group' ? `${t.teacher} training` : t.teacher}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 300 }}>{t.year}</span>{' '}
                      <span style={meta}>
                        / {t.allTime}
                        {t.allTime === 0 && t.next ? ` · next ${formatDayMonth(t.next).split(' ').slice(1).join(' ')}` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="hidden min-[900px]:flex" style={{ flexDirection: 'column', gap: '24px' }}>
                {footer}
              </div>
            </div>
          </div>

          {/* On narrow screens the footer sits under whichever view is showing */}
          <div className="flex min-[900px]:hidden" style={{ flexDirection: 'column', gap: '12px' }}>
            {footer}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Pieces -----------------------------------------------------------------

function Notices({
  sync,
  now,
  loadFailed,
  linkFailed,
  actionError,
  onRetry,
  retrying,
}: {
  sync: SyncResult
  now: Date
  loadFailed: boolean
  linkFailed: 'entry' | 'sit' | null
  actionError: string | null
  onRetry: () => void
  retrying: boolean
}) {
  const notes: { key: string; text: string; error?: boolean; retry?: boolean }[] = []

  if (loadFailed) {
    notes.push({ key: 'load', text: "Couldn't load your diary just now.", error: true, retry: true })
  } else if (!sync.fresh) {
    let text: string
    if (sync.failure === 'not_available' || sync.failure === 'not_configured') {
      text = "Balla Bot isn't sharing your calendar sessions with the app yet."
    } else if (sync.lastSuccessAt) {
      text = `Couldn't get new sessions from your calendar just now. Showing what was there ${timeAgo(sync.lastSuccessAt, now)}.`
    } else {
      text = "Couldn't get your sessions from your calendar just now."
    }
    notes.push({ key: 'sync', text, retry: true })
  }
  if (linkFailed) {
    notes.push({
      key: 'link',
      text:
        linkFailed === 'entry'
          ? "Your entry was saved, but it couldn't be linked to its session. You'll find it in your Journal."
          : "Your sit was saved, but it couldn't be linked to its session. You'll find it in your Stats.",
      error: true,
    })
  }
  if (actionError) notes.push({ key: 'action', text: actionError, error: true })

  if (notes.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {notes.map((n) => (
        <div key={n.key} role={n.error ? 'alert' : 'status'} style={{ ...rowCard, borderColor: n.error ? 'var(--error)' : 'var(--border)' }}>
          <p style={{ ...meta, color: n.error ? 'var(--error)' : 'var(--muted)' }}>
            {n.text}{' '}
            {n.retry && (
              <button type="button" onClick={onRetry} disabled={retrying} style={linkStyle}>
                {retrying ? 'Trying…' : 'Try again'}
              </button>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}

function StatTile({ value, label }: { value: number; label: ReactNode }) {
  return (
    <div
      className="px-1.5 py-3.5 md:p-5"
      style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}
    >
      <p className="text-2xl md:text-[1.875rem]" style={{ fontWeight: 300, color: 'var(--accent)', margin: 0, lineHeight: 1.2 }}>
        {value}
      </p>
      <p className="text-xs md:text-sm" style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
        {label}
      </p>
    </div>
  )
}

function DateBadge({ iso }: { iso: string }) {
  const { day, month } = dateBadge(iso)
  return (
    <div
      style={{
        width: '48px',
        flexShrink: 0,
        textAlign: 'center',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '4px 0',
      }}
    >
      <span style={{ fontSize: '1.25rem', fontWeight: 300, lineHeight: 1.1, display: 'block' }}>{day}</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
        {month}
      </span>
    </div>
  )
}

function KindPill({ row }: { row: DiaryRow }) {
  return (
    <span
      className="hidden md:inline-block"
      style={{
        fontSize: '0.7rem',
        padding: '1px 8px',
        borderRadius: '999px',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        marginLeft: '6px',
        verticalAlign: '2px',
        fontWeight: 400,
      }}
    >
      {KIND_LABELS[row.kind]}
    </span>
  )
}

function SessionName({ row }: { row: DiaryRow }) {
  return (
    <p style={who}>
      <span className="md:hidden">{shortDisplayName(row)}</span>
      <span className="hidden md:inline">{displayName(row)}</span>
      <KindPill row={row} />
    </p>
  )
}

function SessionShell({ row, children, style }: { row: DiaryRow; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...rowCard, ...style }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <DateBadge iso={row.starts_at} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}

function WaitingCard({
  row,
  busy,
  onDismiss,
  onSkip,
}: {
  row: DiaryRow
  busy: boolean
  onDismiss: () => void
  onSkip: () => void
}) {
  const marker = (text: string) => <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>{text}</strong>
  return (
    <SessionShell row={row} style={{ borderColor: 'var(--accent)', borderLeftWidth: '3px' }}>
      <SessionName row={row} />
      <p style={meta}>
        <span className="md:hidden">
          {formatWeekday(row.starts_at)} {formatTimeRange(row.starts_at, row.ends_at, true)} · {marker('Waiting for write-up')}
        </span>
        <span className="hidden md:inline">
          {formatDayMonth(row.starts_at)} · {formatTimeRange(row.starts_at, row.ends_at)} · {marker('Waiting for your write-up')}
        </span>
      </p>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-1 md:gap-2" style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href={writeUpHref(row.source_id)} style={btnPrimary}>
            Write it up
          </Link>
          <Link href={sitHref(row.source_id)} style={btn}>
            Log a sit
          </Link>
        </div>
        {/* Quiet buttons carry their own side padding, so no extra gap: keeps them on one line at 375px */}
        <div className="gap-0 md:gap-2" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <button type="button" onClick={onDismiss} disabled={busy} style={btnQuiet}>
            No write-up needed
          </button>
          <button type="button" onClick={onSkip} disabled={busy} style={btnQuiet}>
            Didn&apos;t happen
          </button>
        </div>
      </div>
    </SessionShell>
  )
}

function inDays(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

function UpcomingRow({ row, now, first }: { row: DiaryRow; now: Date; first: boolean }) {
  const when = first ? ` · ${inDays(daysUntil(row.starts_at, now))}` : ''
  const phoneExtra = first ? when : row.kind === 'group' ? '' : ` · ${KIND_LABELS[row.kind]}`
  return (
    <SessionShell row={row}>
      <SessionName row={row} />
      <p style={meta}>
        <span className="md:hidden">
          {formatWeekday(row.starts_at)} {formatTimeRange(row.starts_at, row.ends_at)}
          {phoneExtra}
        </span>
        <span className="hidden md:inline">
          {formatWeekday(row.starts_at)} · {formatTimeRange(row.starts_at, row.ends_at)}
          {when}
        </span>
      </p>
    </SessionShell>
  )
}

function PastRow({
  row,
  busy,
  onUndoSkip,
  onUndoDismiss,
}: {
  row: DiaryRow
  busy: boolean
  onUndoSkip: () => void
  onUndoDismiss: () => void
}) {
  const when = `${formatWeekday(row.starts_at)} · ${formatTimeRange(row.starts_at, row.ends_at)}`
  const sat = row.sit_seconds !== null ? `✓ Sat ${Math.max(1, Math.round(row.sit_seconds / 60))} min` : null

  if (row.skipped) {
    return (
      <SessionShell row={row} style={{ opacity: 0.6 }}>
        <SessionName row={row} />
        <p style={meta}>
          {when} · marked &quot;didn&apos;t happen&quot; ·{' '}
          <button type="button" onClick={onUndoSkip} disabled={busy} style={linkStyle}>
            Undo
          </button>
        </p>
      </SessionShell>
    )
  }

  let status: ReactNode
  if (row.journal_entry_id) {
    status = (
      <p style={{ color: 'var(--success)', fontSize: '0.875rem', margin: 0 }}>
        ✓ Written up ·{' '}
        <Link href={`/journal/${row.journal_entry_id}/edit`} style={linkStyle}>
          Read entry
        </Link>
        {sat && <>&nbsp; {sat}</>}
      </p>
    )
  } else if (row.writeup_dismissed) {
    status = (
      <p style={meta}>
        No write-up needed ·{' '}
        <button type="button" onClick={onUndoDismiss} disabled={busy} style={linkStyle}>
          Undo
        </button>
        {sat && <span style={{ color: 'var(--success)' }}>&nbsp; {sat}</span>}
      </p>
    )
  } else {
    const beforeDiary = Date.parse(row.created_at) > Date.parse(row.ends_at)
    status = (
      <p style={meta}>
        {beforeDiary ? 'Before the diary existed' : 'Not written up'} ·{' '}
        <Link href={writeUpHref(row.source_id)} style={linkStyle}>
          Write it up
        </Link>
        {sat && <span style={{ color: 'var(--success)' }}>&nbsp; {sat}</span>}
      </p>
    )
  }

  return (
    <SessionShell row={row}>
      <SessionName row={row} />
      <p style={meta}>{when}</p>
      {status}
    </SessionShell>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MonthGrid({ rows, now }: { rows: DiaryRow[]; now: Date }) {
  const todayKey = dayKey(now)
  const [offset, setOffset] = useState(0)

  const byDay = useMemo(() => {
    const map = new Map<string, DiaryRow[]>()
    for (const row of rows) {
      if (row.status !== 'scheduled') continue
      const key = dayKey(row.starts_at)
      map.set(key, [...(map.get(key) ?? []), row])
    }
    return map
  }, [rows])

  const [nowYear, nowMonth] = todayKey.split('-').map(Number)
  const first = new Date(Date.UTC(nowYear, nowMonth - 1 + offset, 1))
  const year = first.getUTCFullYear()
  const month = first.getUTCMonth()
  const lead = (first.getUTCDay() + 6) % 7 // Monday first
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, i) => new Date(Date.UTC(year, month, 1 - lead + i)))
  const weeks = Array.from({ length: cellCount / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  const title = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button type="button" onClick={() => setOffset(offset - 1)} style={btnQuiet} aria-label="Previous month">
          ‹
        </button>
        <strong style={{ fontWeight: 500 }}>{title}</strong>
        <button type="button" onClick={() => setOffset(offset + 1)} style={btnQuiet} aria-label="Next month">
          ›
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d} style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--muted)', padding: '4px 0' }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((date) => {
                const key = date.toISOString().slice(0, 10)
                const inMonth = date.getUTCMonth() === month
                const isToday = key === todayKey
                return (
                  <td
                    key={key}
                    style={{
                      height: '54px',
                      verticalAlign: 'top',
                      border: '1px solid var(--border)',
                      padding: '4px',
                      fontSize: '0.8rem',
                      color: isToday ? 'var(--foreground)' : 'var(--muted)',
                      opacity: inMonth ? 1 : 0.35,
                      outline: isToday ? '2px solid var(--accent)' : undefined,
                      outlineOffset: isToday ? '-2px' : undefined,
                    }}
                  >
                    {date.getUTCDate()}
                    {(byDay.get(key) ?? []).map((row) => (
                      <span
                        key={row.id}
                        title={`${displayName(row)} · ${formatTimeRange(row.starts_at, row.ends_at)}`}
                        style={{
                          display: 'block',
                          marginTop: '2px',
                          fontSize: '0.68rem',
                          lineHeight: 1.2,
                          color: 'var(--foreground)',
                          background: 'rgba(201,168,76,.15)',
                          borderLeft: '2px solid var(--accent)',
                          borderRadius: '3px',
                          padding: '1px 3px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          opacity: row.skipped ? 0.5 : 1,
                        }}
                      >
                        {pipLabel(row)}
                      </span>
                    ))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
