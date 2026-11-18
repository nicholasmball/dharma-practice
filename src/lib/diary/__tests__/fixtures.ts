import type { DiarySession, SourceSession } from '../types'

// Same shape as Balla Bot's reply (see docs/notes/26bbbc17.md). Ids, titles and
// times are invented; the repo is public, so no real calendar text goes here.
export const michaelDec10: SourceSession = {
  id: 'gcal:michael-2026-12-10',
  teacher: 'Michael Taft',
  kind: 'coaching',
  title: 'Coaching call',
  starts_at: '2026-12-10T16:00:00Z',
  ends_at: '2026-12-10T16:55:00Z',
  status: 'confirmed',
}

export const vinceDec3: SourceSession = {
  id: 'gcal:vince-2026-12-03',
  teacher: 'Vince Horn',
  kind: 'mentoring',
  title: 'Mentoring session',
  starts_at: '2026-12-03T14:00:00Z',
  ends_at: '2026-12-03T14:45:00Z',
  status: 'confirmed',
}

export const pdNov13: SourceSession = {
  id: 'gcal:circle-2026-11-13',
  teacher: 'Pragmatic Dharma',
  kind: 'group',
  title: 'Teacher Training Meeting',
  starts_at: '2026-11-13T17:00:00Z',
  ends_at: '2026-11-13T18:00:00Z',
  status: 'confirmed',
}

let counter = 0

export function row(overrides: Partial<DiarySession> = {}): DiarySession {
  counter += 1
  return {
    id: `row-${counter}`,
    user_id: 'user-1',
    source_id: `gcal:row-${counter}`,
    teacher: 'Michael Taft',
    kind: 'coaching',
    title: 'Coaching call',
    starts_at: '2026-11-10T16:00:00Z',
    ends_at: '2026-11-10T16:55:00Z',
    status: 'scheduled',
    skipped: false,
    writeup_dismissed: false,
    journal_entry_id: null,
    meditation_session_id: null,
    last_seen_at: '2026-11-10T00:00:00Z',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}
