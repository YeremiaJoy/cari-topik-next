import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { toQuestion } from '@/server/mappers'
import { deleteQuestionRow, updateQuestionRow } from '@/server/db/operations'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params
    const patch = (await request.json().catch(() => null)) ?? {}
    const row: Parameters<typeof updateQuestionRow>[1] = {}
    if (patch.text !== undefined) {
      row.text_id = patch.text.id
      row.text_en = patch.text.en
    }
    if (patch.category !== undefined) row.category = patch.category
    if (patch.depth !== undefined) row.depth = patch.depth
    if (patch.bias !== undefined) row.bias = patch.bias
    if (patch.forGroup !== undefined) row.for_group = Boolean(patch.forGroup)
    return NextResponse.json(toQuestion(await updateQuestionRow(id, row)))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params
    await deleteQuestionRow(id)
    return new NextResponse(null, { status: 204 })
  })
}
