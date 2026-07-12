import type { SupabaseClient } from '@supabase/supabase-js'
import { toQuestion } from './mappers'
import type { ProfileRow, QuestionRow } from './mappers'
import type { Category, Question } from '../services/types'

export interface RoomStatRow {
  category: Category
  status: 'active' | 'completed'
  favorites: string[]
  created_at: string
}

export async function fetchProfiles(supabase: SupabaseClient): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProfileRow[]
}

export async function fetchRoomStats(supabase: SupabaseClient): Promise<RoomStatRow[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('category, status, favorites, created_at')
  if (error) throw error
  return (data ?? []) as RoomStatRow[]
}

export async function fetchQuestions(supabase: SupabaseClient): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id')
  if (error) throw error
  return ((data ?? []) as QuestionRow[]).map(toQuestion)
}
