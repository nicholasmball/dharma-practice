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

// Badge definitions for milestone achievements
export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  type: 'streak' | 'hours'
  threshold: number
}

export const BADGES: Badge[] = [
  { id: 'first-sit', name: 'First Sit', icon: '☘', description: '1 completed session', type: 'streak', threshold: 1 },
  { id: 'taking-root', name: 'Taking Root', icon: '🌳', description: '7-day streak', type: 'streak', threshold: 7 },
  { id: 'moon-of-practice', name: 'Moon of Practice', icon: '🌕', description: '30-day streak', type: 'streak', threshold: 30 },
  { id: 'mountain-seat', name: 'Mountain Seat', icon: '⛰', description: '100-day streak', type: 'streak', threshold: 100 },
  { id: 'diamond-mind', name: 'Diamond Mind', icon: '💫', description: '365-day streak', type: 'streak', threshold: 365 },
  { id: '10-hours', name: '10 Hours', icon: '☀', description: '10 hours practice', type: 'hours', threshold: 10 },
  { id: '100-hours', name: '100 Hours', icon: '🔥', description: '100 hours practice', type: 'hours', threshold: 100 },
  { id: '1000-hours', name: '1,000 Hours', icon: '🪶', description: '1,000 hours practice', type: 'hours', threshold: 1000 },
]

export function getEarnedBadgeIds(totalSessions: number, longestStreak: number, totalHours: number): Set<string> {
  const earned = new Set<string>()
  for (const badge of BADGES) {
    if (badge.id === 'first-sit') {
      if (totalSessions >= badge.threshold) earned.add(badge.id)
    } else if (badge.type === 'streak') {
      if (longestStreak >= badge.threshold) earned.add(badge.id)
    } else if (badge.type === 'hours') {
      if (totalHours >= badge.threshold) earned.add(badge.id)
    }
  }
  return earned
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
