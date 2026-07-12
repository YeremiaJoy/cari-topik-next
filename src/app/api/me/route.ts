import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { finalizeSoftDeleteUser, markUserDeletionProcessing } from '@/server/db/operations'
import { deleteAuthUser } from '@/server/supabaseAdmin'

export async function GET() {
  return withErrors(async () => {
    const { user } = await requireUser()
    return NextResponse.json(user)
  })
}

export async function DELETE() {
  return withErrors(async () => {
    const { user } = await requireUser()
    await markUserDeletionProcessing(user.id)
    await deleteAuthUser(user.id)
    await finalizeSoftDeleteUser(user.id)
    return new NextResponse(null, { status: 204 })
  })
}
