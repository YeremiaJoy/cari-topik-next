import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toUser } from '@/server/mappers'
import { upgradeUserPlan } from '@/server/db/operations'

/** Upgrade instan ke Pro — gerbang pembayaran menyusul di sini. */
export async function POST() {
  return withErrors(async () => {
    const { user } = await requireUser()
    return NextResponse.json(toUser(await upgradeUserPlan(user.id)))
  })
}
