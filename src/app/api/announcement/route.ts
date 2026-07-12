import { NextResponse } from 'next/server'
import { withErrors } from '@/server/handler'
import { toAnnouncement } from '@/server/mappers'
import { getAnnouncementRow } from '@/server/db/operations'

/** Publik — banner pengumuman tampil juga sebelum login. */
export async function GET() {
  return withErrors(async () => {
    return NextResponse.json(toAnnouncement(await getAnnouncementRow()))
  })
}
