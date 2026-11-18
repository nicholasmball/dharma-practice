import type { DiaryKind, DiarySession } from '@/lib/types'

export type { DiaryKind, DiarySession }

export const DIARY_KINDS: DiaryKind[] = ['coaching', 'mentoring', 'training_1to1', 'group', 'other']

/** One session as Balla Bot's `GET /sessions` reports it. */
export interface SourceSession {
  id: string
  teacher: string
  kind: DiaryKind
  title: string
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
}

export const KIND_LABELS: Record<DiaryKind, string> = {
  coaching: 'Coaching',
  mentoring: 'Mentoring',
  training_1to1: '1:1 training',
  group: 'Group',
  other: 'Session',
}
