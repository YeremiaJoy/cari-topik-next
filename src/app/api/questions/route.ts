import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { toQuestion } from '@/server/mappers'
import { listQuestionRows } from '@/server/db/operations'

/** Bank pertanyaan lengkap — dibaca semua user login, di-cache klien. */
export async function GET() {
  return withErrors(async () => {
    await requireUser()
    return NextResponse.json((await listQuestionRows()).map(toQuestion))
  })
}
