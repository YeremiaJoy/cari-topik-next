import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { setRoomFlagMode } from '@/server/db/operations'

/** Nyalakan/matikan mode flag murni. Khusus akun Pro & room pasangan berdua. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (typeof body?.enabled !== 'boolean') {
      return jsonError(400, 'validation_error', 'Field enabled wajib boolean.')
    }
    return NextResponse.json(toRoom(await setRoomFlagMode(user, id, body.enabled)))
  })
}
