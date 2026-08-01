import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { fetchQuestions } from '@/server/adminData'
import { toQuestion } from '@/server/mappers'
import { createQuestionRow } from '@/server/db/operations'
import type { Bias, Category, Depth, QuestionType } from '@/services/types'

const CATEGORIES: Category[] = ['pasangan', 'teman', 'keluarga']
const DEPTHS: Depth[] = ['ringan', 'sedang', 'dalam']
const BIASES: Bias[] = ['introvert', 'extrovert', 'netral']
const TYPES: QuestionType[] = ['question', 'flag']

export async function GET() {
  return withAdmin(async () => {
    return NextResponse.json(await fetchQuestions())
  })
}

export async function POST(request: Request) {
  return withAdmin(async () => {
    const body = await request.json().catch(() => null)
    const textId = body?.text?.id?.trim()
    const textEn = body?.text?.en?.trim()
    if (!textId || !textEn) return jsonError(400, 'validation_error', 'Teks wajib diisi.')

    const type: QuestionType = TYPES.includes(body?.type) ? body.type : 'question'

    if (type === 'flag') {
      const data = await createQuestionRow({
        text_id: textId,
        text_en: textEn,
        category: 'pasangan',
        depth: 'ringan',
        bias: 'netral',
        for_group: false,
        type: 'flag',
      })
      return NextResponse.json(toQuestion(data), { status: 201 })
    }

    if (!CATEGORIES.includes(body.category)) {
      return jsonError(400, 'validation_error', 'Kategori tidak dikenal.')
    }
    if (!DEPTHS.includes(body.depth)) {
      return jsonError(400, 'validation_error', 'Depth tidak dikenal.')
    }
    if (!BIASES.includes(body.bias)) {
      return jsonError(400, 'validation_error', 'Bias tidak dikenal.')
    }
    const data = await createQuestionRow({
      text_id: textId,
      text_en: textEn,
      category: body.category,
      depth: body.depth,
      bias: body.bias,
      for_group: Boolean(body.forGroup),
      type: 'question',
    })
    return NextResponse.json(toQuestion(data), { status: 201 })
  })
}
