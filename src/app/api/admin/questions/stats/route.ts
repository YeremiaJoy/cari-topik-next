import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { listQuestionStats } from '@/server/db/operations'

/** Performa tiap kartu — dipakai panel admin buat menilai isi bank. */
export async function GET() {
  return withAdmin(async () => {
    return NextResponse.json(await listQuestionStats())
  })
}
