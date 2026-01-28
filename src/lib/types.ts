// Database types for our Supabase tables

// Built-in practice types
export type BuiltInPracticeType = 'shamatha' | 'vipashyana' | 'mahamudra' | 'dzogchen' | 'other'

// PracticeType can be a built-in type or any custom string
export type PracticeType = BuiltInPracticeType | string

// Custom practice type stored in user settings
export interface CustomPracticeType {
  name: string
  description?: string
}

// Array of built-in practice types for iteration
export const BUILT_IN_PRACTICE_TYPES: BuiltInPracticeType[] = ['shamatha', 'vipashyana', 'mahamudra', 'dzogchen', 'other']

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
  custom_practice_types?: CustomPracticeType[]
  created_at: string
  updated_at: string
}

// Helper type for built-in practice type labels
export const practiceTypeLabels: Record<BuiltInPracticeType, string> = {
  shamatha: 'Shamatha (Calm Abiding)',
  vipashyana: 'Vipashyana (Insight)',
  mahamudra: 'Mahamudra',
  dzogchen: 'Dzogchen',
  other: 'Other'
}

// Helper to get label for any practice type (built-in or custom)
export function getPracticeTypeLabel(type: string, customTypes?: CustomPracticeType[]): string {
  // Check if it's a built-in type
  if (type in practiceTypeLabels) {
    return practiceTypeLabels[type as BuiltInPracticeType]
  }
  // Check custom types for a matching name (case-insensitive key match)
  const customType = customTypes?.find(ct => ct.name.toLowerCase() === type.toLowerCase())
  if (customType) {
    return customType.name
  }
  // Fallback: capitalize the type
  return type.charAt(0).toUpperCase() + type.slice(1)
}
