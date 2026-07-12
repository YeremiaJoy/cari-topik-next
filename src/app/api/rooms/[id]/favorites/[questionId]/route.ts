import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toRoom } from '@/server/mappers'
import { toggleFavorite } from '@/server/db/operations'

/** Toggle favorit: hapus bila sudah ada, tambah bila belum. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id, questionId } = await params
    return NextResponse.json(toRoom(await toggleFavorite(user.id, id, questionId)))
  })
}
