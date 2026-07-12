import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toQuestion } from '@/server/mappers'
import type { QuestionRow } from '@/server/mappers'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { id } = await params
    const patch = (await request.json().catch(() => null)) ?? {}
    const row: Record<string, unknown> = {}
    if (patch.text !== undefined) {
      row.text_id = patch.text.id
      row.text_en = patch.text.en
    }
    if (patch.category !== undefined) row.category = patch.category
    if (patch.depth !== undefined) row.depth = patch.depth
    if (patch.bias !== undefined) row.bias = patch.bias
    if (patch.forGroup !== undefined) row.for_group = Boolean(patch.forGroup)
    const { data, error } = await supabase
      .from('questions')
      .update(row)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(toQuestion(data as QuestionRow))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { id } = await params
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  })
}
