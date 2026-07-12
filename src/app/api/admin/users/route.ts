import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { fetchProfiles } from '@/server/adminData'
import { toUser } from '@/server/mappers'

export async function GET() {
  return withErrors(async () => {
    await requireAdmin()
    return NextResponse.json((await fetchProfiles()).map(toUser))
  })
}
