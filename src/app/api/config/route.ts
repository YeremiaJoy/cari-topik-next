import { NextResponse } from 'next/server'
import { withErrors } from '@/server/handler'
import { toAppConfig } from '@/server/mappers'
import { getConfigRow } from '@/server/db/operations'

/** Publik — dipakai halaman landing/pricing sebelum login. */
export async function GET() {
  return withErrors(async () => {
    return NextResponse.json(toAppConfig(await getConfigRow()))
  })
}
