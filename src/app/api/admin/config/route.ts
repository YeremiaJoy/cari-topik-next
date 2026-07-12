import { NextResponse } from 'next/server'
import { requireAdmin } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toAppConfig } from '@/server/mappers'
import { getConfigRow, updateConfigRow } from '@/server/db/operations'
import type { AppConfig } from '@/services/types'

export async function GET() {
  return withErrors(async () => {
    await requireAdmin()
    return NextResponse.json(toAppConfig(await getConfigRow()))
  })
}

export async function PATCH(request: Request) {
  return withErrors(async () => {
    await requireAdmin()
    const patch = ((await request.json().catch(() => null)) ?? {}) as Partial<AppConfig>
    return NextResponse.json(toAppConfig(await updateConfigRow(patch)))
  })
}
