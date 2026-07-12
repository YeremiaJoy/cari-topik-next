import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServer } from './supabase'
import { toUser } from './mappers'
import type { ProfileRow } from './mappers'
import type { User } from '../services/types'

export class HttpError extends Error {
  statusCode: number
  code: string
  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export interface AuthedContext {
  supabase: SupabaseClient
  user: User
}

/** Ambil sesi + profil; lempar HttpError 401 bila belum login. */
export async function requireUser(): Promise<AuthedContext> {
  const supabase = await supabaseServer()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new HttpError(401, 'not_authenticated', 'Harus login.')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()
  if (error || !data) throw new HttpError(401, 'not_authenticated', 'Profil tidak ditemukan.')
  return { supabase, user: toUser(data as ProfileRow) }
}

/** Seperti requireUser, plus wajib role admin (403 bila bukan). */
export async function requireAdmin(): Promise<AuthedContext> {
  const ctx = await requireUser()
  if (ctx.user.role !== 'admin') throw new HttpError(403, 'forbidden', 'Khusus admin.')
  return ctx
}
