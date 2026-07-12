import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { toAnnouncement } from '@/server/mappers'
import { getAnnouncementRow, updateAnnouncementRow } from '@/server/db/operations'
import type { Announcement } from '@/services/types'

export async function GET() {
  return withAdmin(async () => {
    return NextResponse.json(toAnnouncement(await getAnnouncementRow()))
  })
}

/** PUT body: Announcement atau null (null = kosongkan & nonaktifkan). */
export async function PUT(request: Request) {
  return withAdmin(async () => {
    const announcement = (await request.json().catch(() => null)) as Announcement | null
    const row = announcement
      ? {
          message_id: announcement.message.id,
          message_en: announcement.message.en,
          enabled: announcement.enabled,
        }
      : { message_id: '', message_en: '', enabled: false }
    await updateAnnouncementRow(row)
    return new NextResponse(null, { status: 204 })
  })
}
