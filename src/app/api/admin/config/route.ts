import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { toAppConfig } from '@/server/mappers'
import { getConfigRow, updateConfigRow } from '@/server/db/operations'
import type { AppConfig } from '@/services/types'

export async function GET() {
  return withAdmin(async () => {
    return NextResponse.json(toAppConfig(await getConfigRow()))
  })
}

export async function PATCH(request: Request) {
  return withAdmin(async () => {
    const patch = ((await request.json().catch(() => null)) ?? {}) as Partial<AppConfig>
    return NextResponse.json(toAppConfig(await updateConfigRow(patch)))
  })
}
