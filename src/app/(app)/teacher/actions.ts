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
