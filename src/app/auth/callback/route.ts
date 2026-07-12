import { NextResponse } from 'next/server'
import { supabaseServer } from '@/server/supabase'

/** Tukar kode OAuth (PKCE) menjadi sesi cookie, lalu lanjut ke halaman tujuan. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/room'

  if (code) {
    const supabase = await supabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }
  return NextResponse.redirect(new URL('/login', url.origin))
}
