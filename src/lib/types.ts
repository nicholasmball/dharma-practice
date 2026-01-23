// Database types for our Supabase tables

export type PracticeType = 'shamatha' | 'vipashyana' | 'mahamudra' | 'dzogchen' | 'other'

export interface MeditationSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  practice_type: PracticeType
  completed: boolean
  notes: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  title: string | null
  content: string
  tags: string[]
  practice_type: PracticeType | null
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  meditation_reminder_enabled: boolean
  meditation_reminder_time: string | null
  journal_reminder_enabled: boolean
  journal_reminder_time: string | null
  default_session_duration: number
  default_practice_type: PracticeType
  created_at: string
  updated_at: string
}

// Helper type for practice type labels
export const practiceTypeLabels: Record<PracticeType, string> = {
  shamatha: 'Shamatha (Calm Abiding)',
  vipashyana: 'Vipashyana (Insight)',
  mahamudra: 'Mahamudra',
  dzogchen: 'Dzogchen',
  other: 'Other'
}
