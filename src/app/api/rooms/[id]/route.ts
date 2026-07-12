import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { deleteRoomForUser, getRoomForUser } from '@/server/db/operations'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id } = await params
    const data = await getRoomForUser(user.id, id)
    if (!data) return jsonError(404, 'room_not_found', 'Room tidak ditemukan.')
    return NextResponse.json(toRoom(data))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id } = await params
    await deleteRoomForUser(user, id)
    return new NextResponse(null, { status: 204 })
  })
}
