import { NextResponse } from 'next/server'
import { supabaseServer } from '@/server/supabase'
import { withErrors } from '@/server/handler'
import { toAppConfig } from '@/server/mappers'
import type { AppConfigRow } from '@/server/mappers'
import { DEFAULT_APP_CONFIG } from '@/services/types'

/** Publik — dipakai halaman landing/pricing sebelum login. */
export async function GET() {
  return withErrors(async () => {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.from('app_config').select('*').maybeSingle()
    if (error) throw error
    return NextResponse.json(data ? toAppConfig(data as AppConfigRow) : DEFAULT_APP_CONFIG)
  })
}
