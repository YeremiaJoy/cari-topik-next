import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toRoom } from '@/server/mappers'
import type { RoomRow } from '@/server/mappers'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { id } = await params
    const { data, error } = await supabase.rpc('end_session', { p_room_id: id })
    if (error) throw error
    return NextResponse.json(toRoom(data as RoomRow))
  })
}
