import { NextResponse } from 'next/server'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { expireDueSubscriptions } from '@/server/db/operations'

/**
 * Cron sweep: turunkan user yang subscriptions.ends_at sudah lewat ke free.
 * Vercel Cron memanggil via GET dengan header Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  return withErrors(async () => {
    const expected = `Bearer ${process.env.CRON_SECRET}`
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== expected) {
      return jsonError(401, 'not_authenticated', 'Tidak diizinkan.')
    }
    return NextResponse.json(await expireDueSubscriptions())
  })
}
