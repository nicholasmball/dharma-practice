'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('teacher_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return data || []
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('teacher_conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return data
}

export async function createConversation(title: string, messages: Message[]): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('teacher_conversations')
    .insert({
      user_id: user.id,
      title,
      messages,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    return null
  }

  revalidatePath('/teacher')
  return data.id
}

export async function updateConversation(id: string, messages: Message[], title?: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const updateData: { messages: Message[]; updated_at: string; title?: string } = {
    messages,
    updated_at: new Date().toISOString(),
  }

  if (title) {
    updateData.title = title
  }

  const { error } = await supabase
    .from('teacher_conversations')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating conversation:', error)
    return false
  }

  revalidatePath('/teacher')
  return true
}

export async function deleteConversation(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('teacher_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting conversation:', error)
    return false
  }

  revalidatePath('/teacher')
  return true
}

export interface PracticeProfile {
  sessionCount: number
  dominantPracticeType: string | null
  daysSinceLastSession: number | null
  currentStreak: number
}

export async function getPracticeProfile(): Promise<PracticeProfile> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { sessionCount: 0, dominantPracticeType: null, daysSinceLastSession: null, currentStreak: 0 }
  }

  const { data: sessions } = await supabase
    .from('meditation_sessions')
    .select('practice_type, started_at, ended_at')
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('started_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return { sessionCount: 0, dominantPracticeType: null, daysSinceLastSession: null, currentStreak: 0 }
  }

  // Session count
  const sessionCount = sessions.length

  // Dominant practice type
  const typeCounts: Record<string, number> = {}
  sessions.forEach(s => {
    typeCounts[s.practice_type] = (typeCounts[s.practice_type] || 0) + 1
  })
  const dominantPracticeType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Days since last session
  const lastSession = sessions[0]
  const lastDate = new Date(lastSession.ended_at || lastSession.started_at)
  const now = new Date()
  const daysSinceLastSession = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  // Current streak
  const dates = new Set<string>()
  sessions.forEach(s => {
    const date = new Date(s.started_at)
    dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  })

  const sortedDates = Array.from(dates).map(d => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m, day)
  }).sort((a, b) => b.getTime() - a.getTime())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const msPerDay = 24 * 60 * 60 * 1000

  let currentStreak = 0
  if (sortedDates.length > 0) {
    const mostRecent = new Date(sortedDates[0])
    mostRecent.setHours(0, 0, 0, 0)

    if (mostRecent.getTime() === today.getTime() || mostRecent.getTime() === yesterday.getTime()) {
      currentStreak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        prev.setHours(0, 0, 0, 0)
        curr.setHours(0, 0, 0, 0)
        if (prev.getTime() - curr.getTime() === msPerDay) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  return { sessionCount, dominantPracticeType, daysSinceLastSession, currentStreak }
}
