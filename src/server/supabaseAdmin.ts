import { createClient } from '@supabase/supabase-js'
import { HttpError } from './auth'

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new HttpError(500, 'config_error', 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.')
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId)
  if (error) throw new HttpError(500, 'auth_delete_failed', error.message)
}
