import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { fetchProfiles } from '@/server/adminData'
import { toUser } from '@/server/mappers'

export async function GET() {
  return withAdmin(async () => {
    return NextResponse.json((await fetchProfiles()).map(toUser))
  })
}
