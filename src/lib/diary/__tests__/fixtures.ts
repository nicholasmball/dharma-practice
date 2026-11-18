import type { DiarySession, SourceSession } from '../types'

// Same shape as Balla Bot's reply (see docs/notes/26bbbc17.md). Ids, titles and
// times (and years) are invented; the repo is public, so no real calendar text
// goes here.
export const michaelCoaching: SourceSession = {
  id: 'gcal:example-coaching-1',
  teacher: 'Michael Taft',
  kind: 'coaching',
  title: 'Coaching call',
  starts_at: '2037-12-09T10:00:00Z',
  ends_at: '2037-12-09T10:55:00Z',
  status: 'confirmed',
}

export const vinceMentoring: SourceSession = {
  id: 'gcal:example-mentoring-1',
  teacher: 'Vince Horn',
  kind: 'mentoring',
  title: 'Mentoring session',
  starts_at: '2037-12-01T11:00:00Z',
  ends_at: '2037-12-01T11:45:00Z',
  status: 'confirmed',
}

export const pdGroup: SourceSession = {
  id: 'gcal:example-group-1',
  teacher: 'Pragmatic Dharma',
  kind: 'group',
  title: 'Group meeting',
  starts_at: '2037-11-20T19:00:00Z',
  ends_at: '2037-11-20T20:00:00Z',
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
    starts_at: '2037-11-09T10:00:00Z',
    ends_at: '2037-11-09T10:55:00Z',
    status: 'scheduled',
    skipped: false,
    writeup_dismissed: false,
    journal_entry_id: null,
    meditation_session_id: null,
    last_seen_at: '2037-11-10T00:00:00Z',
    created_at: '2037-11-01T00:00:00Z',
    updated_at: '2037-11-01T00:00:00Z',
    ...overrides,
  }
}
