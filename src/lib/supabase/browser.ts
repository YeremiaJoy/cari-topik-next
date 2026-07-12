import { createBrowserClient } from '@supabase/ssr'

/**
 * Klien Supabase di browser — hanya untuk alur auth (OAuth Google, signOut).
 * Semua akses data lewat API route Next; jangan query tabel dari sini.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
