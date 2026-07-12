import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toRoom } from '@/server/mappers'
import { endRoom } from '@/server/db/operations'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id } = await params
    return NextResponse.json(toRoom(await endRoom(user.id, id)))
  })
}
