import { NextResponse } from 'next/server'
import { HttpError } from '@/server/auth'
import { withAdmin } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toUser } from '@/server/mappers'
import { finalizeSoftDeleteUser, markUserDeletionProcessing, setUserPlan } from '@/server/db/operations'

type Params = { params: Promise<{ id: string }> }

/** Ubah plan user (free/pro). Role tidak pernah bisa diubah lewat API. */
export async function PATCH(request: Request, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const plan = body?.plan
    if (plan !== 'free' && plan !== 'pro') {
      return jsonError(400, 'validation_error', 'plan harus free atau pro.')
    }
    return NextResponse.json(toUser(await setUserPlan(id, plan)))
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withAdmin(async ({ user }) => {
    const { id } = await params
    if (id === user.id) {
      throw new HttpError(409, 'cannot_delete_self', 'Tidak bisa menghapus akun sendiri dari sini.')
    }
    await markUserDeletionProcessing(id)
    await finalizeSoftDeleteUser(id)
    return new NextResponse(null, { status: 204 })
  })
}
