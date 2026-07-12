import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { fetchQuestions } from '@/server/adminData'
import { toQuestion } from '@/server/mappers'
import type { QuestionRow } from '@/server/mappers'
import type { Bias, Category, Depth } from '@/services/types'

const CATEGORIES: Category[] = ['pasangan', 'teman', 'keluarga']
const DEPTHS: Depth[] = ['ringan', 'sedang', 'dalam']
const BIASES: Bias[] = ['introvert', 'extrovert', 'netral']

export async function GET() {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    return NextResponse.json(await fetchQuestions(supabase))
  })
}

export async function POST(request: Request) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const body = await request.json().catch(() => null)
    const textId = body?.text?.id?.trim()
    const textEn = body?.text?.en?.trim()
    if (!textId || !textEn) return jsonError(400, 'validation_error', 'Teks wajib diisi.')
    if (!CATEGORIES.includes(body.category)) {
      return jsonError(400, 'validation_error', 'Kategori tidak dikenal.')
    }
    if (!DEPTHS.includes(body.depth)) {
      return jsonError(400, 'validation_error', 'Depth tidak dikenal.')
    }
    if (!BIASES.includes(body.bias)) {
      return jsonError(400, 'validation_error', 'Bias tidak dikenal.')
    }
    const { data, error } = await supabase
      .from('questions')
      .insert({
        id: crypto.randomUUID(),
        text_id: textId,
        text_en: textEn,
        category: body.category,
        depth: body.depth,
        bias: body.bias,
        for_group: Boolean(body.forGroup),
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(toQuestion(data as QuestionRow), { status: 201 })
  })
}
