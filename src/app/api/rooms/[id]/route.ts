import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import type { RoomRow } from '@/server/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { id } = await params
    const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle()
    if (error) {
      // id bukan uuid valid → perlakukan seperti room tidak ada.
      if (error.code === '22P02') return jsonError(404, 'room_not_found', 'Room tidak ditemukan.')
      throw error
    }
    if (!data) return jsonError(404, 'room_not_found', 'Room tidak ditemukan.')
    return NextResponse.json(toRoom(data as RoomRow))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { id } = await params
    const { error } = await supabase.rpc('delete_room', { p_room_id: id })
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  })
}
