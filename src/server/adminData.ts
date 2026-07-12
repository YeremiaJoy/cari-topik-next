import { desc, eq } from 'drizzle-orm'
import { getDb } from './db'
import { questionCategories, questions, rooms } from './db/schema'
import { listProfileRows } from './db/operations'
import { toQuestion } from './mappers'
import type { ProfileRow, QuestionRow } from './mappers'
import type { Category, Question } from '../services/types'

export interface RoomStatRow {
  category: Category
  status: 'active' | 'completed'
  favorites: string[]
  created_at: string
}

export async function fetchProfiles(): Promise<ProfileRow[]> {
  return listProfileRows()
}

export async function fetchRoomStats(): Promise<RoomStatRow[]> {
  return (await getDb()
    .select({
      category: questionCategories.name,
      status: rooms.status,
      favorites: rooms.favorites,
      created_at: rooms.created_at,
    })
    .from(rooms)
    .innerJoin(questionCategories, eq(rooms.category_id, questionCategories.id))) as RoomStatRow[]
}

export async function fetchQuestions(): Promise<Question[]> {
  const rows = await getDb()
    .select({
      id: questions.id,
      question_code: questions.question_code,
      text_id: questions.text_id,
      text_en: questions.text_en,
      category: questionCategories.name,
      depth: questions.depth,
      bias: questions.bias,
      for_group: questions.for_group,
    })
    .from(questions)
    .innerJoin(questionCategories, eq(questions.category_id, questionCategories.id))
    .orderBy(desc(questions.created_at), questions.id)
  return (rows as QuestionRow[]).map(toQuestion)
}
