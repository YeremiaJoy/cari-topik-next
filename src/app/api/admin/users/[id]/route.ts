import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toUser } from '@/server/mappers'
import type { ProfileRow } from '@/server/mappers'

type Params = { params: Promise<{ id: string }> }

/** Ubah plan user (free/pro). Role tidak pernah bisa diubah lewat API. */
export async function PATCH(request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => null)
    const plan = body?.plan
    if (plan !== 'free' && plan !== 'pro') {
      return jsonError(400, 'validation_error', 'plan harus free atau pro.')
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ plan })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(toUser(data as ProfileRow))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { id } = await params
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id })
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  })
}
