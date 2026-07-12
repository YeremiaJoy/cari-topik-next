import { NextResponse } from 'next/server'
import { supabaseServer } from '@/server/supabase'
import { withErrors } from '@/server/handler'
import { toAnnouncement } from '@/server/mappers'
import type { AnnouncementRow } from '@/server/mappers'

/** Publik — banner pengumuman tampil juga sebelum login. */
export async function GET() {
  return withErrors(async () => {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.from('announcements').select('*').maybeSingle()
    if (error) throw error
    return NextResponse.json(toAnnouncement(data as AnnouncementRow | null))
  })
}
