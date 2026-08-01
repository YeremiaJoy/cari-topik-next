import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { setFlagVotes } from '@/server/db/operations'
import type { FlagVote } from '@/services/types'

const VOTES: FlagVote[] = ['red', 'green']

/** Simpan sepasang suara sekaligus — klien mengirim setelah tap kedua. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id, questionId } = await params
    const body = await request.json().catch(() => null)
    if (!VOTES.includes(body?.p1) || !VOTES.includes(body?.p2)) {
      return jsonError(400, 'validation_error', 'Suara harus red atau green.')
    }
    const room = await setFlagVotes(user.id, id, questionId, { p1: body.p1, p2: body.p2 })
    return NextResponse.json(toRoom(room))
  })
}
