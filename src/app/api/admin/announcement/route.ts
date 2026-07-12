import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toAnnouncement } from '@/server/mappers'
import type { AnnouncementRow } from '@/server/mappers'
import type { Announcement } from '@/services/types'

export async function GET() {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.from('announcements').select('*').maybeSingle()
    if (error) throw error
    return NextResponse.json(toAnnouncement(data as AnnouncementRow | null))
  })
}

/** PUT body: Announcement atau null (null = kosongkan & nonaktifkan). */
export async function PUT(request: Request) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const announcement = (await request.json().catch(() => null)) as Announcement | null
    const row = announcement
      ? {
          message_id: announcement.message.id,
          message_en: announcement.message.en,
          enabled: announcement.enabled,
        }
      : { message_id: '', message_en: '', enabled: false }
    const { error } = await supabase.from('announcements').update(row).eq('id', true)
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  })
}
