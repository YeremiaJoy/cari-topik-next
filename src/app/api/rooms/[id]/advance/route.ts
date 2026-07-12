import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toRoom } from '@/server/mappers'
import type { RoomRow } from '@/server/mappers'

/** Maju satu kartu; kuota jendela free ditegakkan RPC advance_card. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { id } = await params
    const { data, error } = await supabase.rpc('advance_card', { p_room_id: id })
    if (error) throw error
    return NextResponse.json(toRoom(data as RoomRow))
  })
}
