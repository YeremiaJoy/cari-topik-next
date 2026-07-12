import { supabaseServer } from './supabase'
import { toUser } from './mappers'
import { assertActiveProfile, syncAuthProfile } from './db/operations'
import { HttpError } from './httpError'
import type { User } from '../services/types'

export { HttpError }

export interface AuthedContext {
  user: User
}

/** Ambil sesi Supabase Auth, lalu sinkronkan profil aplikasi di Neon. */
export async function requireUser(): Promise<AuthedContext> {
  const supabase = await supabaseServer()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new HttpError(401, 'not_authenticated', 'Harus login.')

  const meta = authUser.user_metadata ?? {}
  const name =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : (authUser.email?.split('@')[0] ?? '')
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : ''
  const email = authUser.email ?? ''

  const providerName =
    typeof authUser.app_metadata?.provider === 'string' ? authUser.app_metadata.provider : 'google'
  const profile = await syncAuthProfile({ id: authUser.id, name, email, avatarUrl, providerName })
  assertActiveProfile(profile)
  return { user: toUser(profile) }
}

/** Seperti requireUser, plus wajib role admin (403 bila bukan). */
export async function requireAdmin(): Promise<AuthedContext> {
  const ctx = await requireUser()
  if (ctx.user.role !== 'admin') throw new HttpError(403, 'forbidden', 'Khusus admin.')
  return ctx
}
