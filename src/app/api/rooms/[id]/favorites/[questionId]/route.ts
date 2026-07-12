import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toRoom } from '@/server/mappers'
import type { RoomRow } from '@/server/mappers'

/** Toggle favorit: hapus bila sudah ada, tambah bila belum. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { id, questionId } = await params
    const { data, error } = await supabase.rpc('toggle_favorite', {
      p_room_id: id,
      p_question_id: questionId,
    })
    if (error) throw error
    return NextResponse.json(toRoom(data as RoomRow))
  })
}
