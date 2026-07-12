import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toAppConfig } from '@/server/mappers'
import type { AppConfigRow } from '@/server/mappers'
import type { AppConfig } from '@/services/types'

export async function GET() {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.from('app_config').select('*').single()
    if (error) throw error
    return NextResponse.json(toAppConfig(data as AppConfigRow))
  })
}

export async function PATCH(request: Request) {
  return withErrors(async () => {
    const { supabase } = await requireAdmin()
    const patch = ((await request.json().catch(() => null)) ?? {}) as Partial<AppConfig>
    const row: Partial<AppConfigRow> = {}
    if (patch.freeMaxParticipants !== undefined) row.free_max_participants = patch.freeMaxParticipants
    if (patch.freeMaxQuestions !== undefined) row.free_max_questions = patch.freeMaxQuestions
    if (patch.freeMaxRooms !== undefined) row.free_max_rooms = patch.freeMaxRooms
    if (patch.proPrice !== undefined) row.pro_price = patch.proPrice
    if (patch.proPriceAfterDiscount !== undefined) row.pro_price_after_discount = patch.proPriceAfterDiscount
    const { data, error } = await supabase
      .from('app_config')
      .update(row)
      .eq('id', true)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(toAppConfig(data as AppConfigRow))
  })
}
