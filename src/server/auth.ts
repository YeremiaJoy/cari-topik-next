import { cookies } from 'next/headers'
import { toUser } from './mappers'
import { assertActiveProfile, getProfileById } from './db/operations'
import { SESSION_COOKIE, verifySession } from './session'
import { HttpError } from './httpError'
import type { User } from '../services/types'

export { HttpError }

export interface AuthedContext {
  user: User
}

/** Baca sesi aplikasi dari cookie, verifikasi, lalu muat profil dari Neon. */
export async function requireUser(): Promise<AuthedContext> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) throw new HttpError(401, 'not_authenticated', 'Harus login.')

  const profile = await getProfileById(session.uid)
  if (!profile) throw new HttpError(401, 'not_authenticated', 'Profil tidak ditemukan.')
  assertActiveProfile(profile)
  return { user: toUser(profile) }
}

/** Seperti requireUser, plus wajib role admin (403 bila bukan). */
export async function requireAdmin(): Promise<AuthedContext> {
  const ctx = await requireUser()
  if (ctx.user.role !== 'admin') throw new HttpError(403, 'forbidden', 'Khusus admin.')
  return ctx
}
