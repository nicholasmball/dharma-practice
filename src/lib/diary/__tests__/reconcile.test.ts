import { describe, expect, it } from 'vitest'
import { reconcile } from '../reconcile'
import { michaelDec10, pdNov13, row, vinceDec3 } from './fixtures'

const now = new Date('2026-11-18T05:00:00Z')
const window = { from: new Date('2026-09-19T05:00:00Z'), to: new Date('2027-11-18T05:00:00Z'), now }

describe('reconcile', () => {
  it('turns a new session into a row to save', () => {
    const result = reconcile([], [michaelDec10], window)
    expect(result.markRemoved).toEqual([])
    expect(result.upserts).toEqual([
      {
        source_id: michaelDec10.id,
        teacher: 'Michael Taft',
        kind: 'coaching',
        title: michaelDec10.title,
        starts_at: michaelDec10.starts_at,
        ends_at: michaelDec10.ends_at,
        status: 'scheduled',
        last_seen_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ])
  })

  it('updates a moved session by its id', () => {
    const existing = row({ source_id: michaelDec10.id, starts_at: '2026-12-09T16:00:00Z', ends_at: '2026-12-09T16:55:00Z' })
    const result = reconcile([existing], [michaelDec10], window)
    expect(result.upserts).toHaveLength(1)
    expect(result.upserts[0].starts_at).toBe(michaelDec10.starts_at)
    expect(result.markRemoved).toEqual([])
  })

  it('records a cancelled session as cancelled', () => {
    const result = reconcile([], [{ ...vinceDec3, status: 'cancelled' }], window)
    expect(result.upserts[0].status).toBe('cancelled')
  })

  it('marks a future session that has gone from the calendar as removed', () => {
    const gone = row({ source_id: 'gcal:gone', starts_at: '2026-12-01T10:00:00Z', ends_at: '2026-12-01T11:00:00Z' })
    const result = reconcile([gone], [michaelDec10], window)
    expect(result.markRemoved).toEqual([gone.id])
  })

  it('also removes a missing session that started within the last day', () => {
    const recent = row({ source_id: 'gcal:recent', starts_at: '2026-11-17T10:00:00Z', ends_at: '2026-11-17T11:00:00Z' })
    expect(reconcile([recent], [], window).markRemoved).toEqual([recent.id])
  })

  it('never removes a past session just because it is missing', () => {
    const past = row({ source_id: 'gcal:past', starts_at: '2026-11-06T17:00:00Z', ends_at: '2026-11-06T18:00:00Z', journal_entry_id: 'j1' })
    expect(reconcile([past], [], window).markRemoved).toEqual([])
  })

  it('leaves sessions outside the window alone', () => {
    const later = row({ source_id: 'gcal:later', starts_at: '2028-01-01T10:00:00Z', ends_at: '2028-01-01T11:00:00Z' })
    expect(reconcile([later], [], window).markRemoved).toEqual([])
  })

  it('does not mark an already removed session again', () => {
    const removed = row({ source_id: 'gcal:x', status: 'removed', starts_at: '2026-12-01T10:00:00Z', ends_at: '2026-12-01T11:00:00Z' })
    expect(reconcile([removed], [], window).markRemoved).toEqual([])
  })

  it('brings back a removed session that reappears', () => {
    const removed = row({ source_id: michaelDec10.id, status: 'removed' })
    const result = reconcile([removed], [michaelDec10], window)
    expect(result.upserts[0].status).toBe('scheduled')
  })

  it('never sends the fields the user controls, so their choices and links survive', () => {
    const existing = row({ source_id: pdNov13.id, skipped: true, writeup_dismissed: true, journal_entry_id: 'j1', meditation_session_id: 'm1' })
    const [upsert] = reconcile([existing], [pdNov13], window).upserts
    for (const key of ['skipped', 'writeup_dismissed', 'journal_entry_id', 'meditation_session_id', 'id', 'user_id']) {
      expect(upsert).not.toHaveProperty(key)
    }
  })

  it('keeps only the first copy when the same id comes twice in one reply', () => {
    const result = reconcile([], [michaelDec10, { ...michaelDec10, title: 'duplicate' }], window)
    expect(result.upserts).toHaveLength(1)
    expect(result.upserts[0].title).toBe(michaelDec10.title)
  })
})
