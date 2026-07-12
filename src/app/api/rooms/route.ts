import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { createRoomForUser, listRoomsForUser } from '@/server/db/operations'
import type { Category, Personality } from '@/services/types'

const CATEGORIES: Category[] = ['pasangan', 'teman', 'keluarga']
const PERSONALITIES: Personality[] = ['introvert', 'extrovert']

export async function GET() {
  return withErrors(async () => {
    const { user } = await requireUser()
    return NextResponse.json((await listRoomsForUser(user.id)).map(toRoom))
  })
}

/**
 * Buat room: deck dikomposisi di server dari bank pertanyaan, lalu
 * kuota free (peserta, jumlah room) ditegakkan RPC create_room.
 */
export async function POST(request: Request) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const body = await request.json().catch(() => null)
    const participantCount = Number(body?.participantCount)
    const category = body?.category as Category
    const personalities = body?.personalities as [Personality, Personality] | undefined

    if (!Number.isInteger(participantCount) || participantCount < 2) {
      return jsonError(400, 'validation_error', 'participantCount minimal 2.')
    }
    if (!CATEGORIES.includes(category)) {
      return jsonError(400, 'validation_error', 'Kategori tidak dikenal.')
    }
    if (personalities !== undefined) {
      const valid =
        participantCount === 2 &&
        Array.isArray(personalities) &&
        personalities.length === 2 &&
        personalities.every((p) => PERSONALITIES.includes(p))
      if (!valid) return jsonError(400, 'validation_error', 'personalities tidak valid.')
    }

    const room = await createRoomForUser(user, { participantCount, category, personalities })
    return NextResponse.json(toRoom(room), { status: 201 })
  })
}
