import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toUser } from '@/server/mappers'
import type { ProfileRow } from '@/server/mappers'

/** Upgrade instan ke Pro — gerbang pembayaran menyusul di sini. */
export async function POST() {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { data, error } = await supabase.rpc('upgrade_to_pro')
    if (error) throw error
    return NextResponse.json(toUser(data as ProfileRow))
  })
}
