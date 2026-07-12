import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/server/session'

/** Hapus cookie sesi aplikasi. */
export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return res
}
