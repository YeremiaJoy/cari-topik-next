import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toQuestion } from '@/server/mappers'
import type { QuestionRow } from '@/server/mappers'

/** Bank pertanyaan lengkap — dibaca semua user login, di-cache klien. */
export async function GET() {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
    if (error) throw error
    return NextResponse.json(((data ?? []) as QuestionRow[]).map(toQuestion))
  })
}
