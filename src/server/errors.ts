import { NextResponse } from 'next/server'

/** Kontrak error API: { statusCode, code, message, resetAt? }. */
export interface ApiError {
  statusCode: number
  code: string
  message: string
  resetAt?: string
}

export function jsonError(statusCode: number, code: string, message: string, resetAt?: string) {
  const body: ApiError = { statusCode, code, message, ...(resetAt ? { resetAt } : {}) }
  return NextResponse.json(body, { status: statusCode })
}

interface SupabaseErrorLike {
  message: string
  details?: string | null
  code?: string
}

/**
 * Peta error RPC/PostgREST ke kontrak API.
 * RPC melempar 'paywall:<reason>' (detail = ISO resetAt untuk 'questions'),
 * 'not_authenticated', dan pesan "Room ..." untuk kasus room.
 */
export function mapSupabaseError(error: SupabaseErrorLike) {
  const msg = error.message
  if (msg === 'paywall:participants' || msg === 'paywall:rooms') {
    return jsonError(402, msg, 'Batas paket gratis tercapai.')
  }
  if (msg === 'paywall:questions') {
    return jsonError(402, msg, 'Kuota kartu habis.', error.details || undefined)
  }
  if (msg === 'not_authenticated') {
    return jsonError(401, 'not_authenticated', 'Harus login.')
  }
  if (msg === 'forbidden') {
    return jsonError(403, 'forbidden', 'Tidak diizinkan.')
  }
  if (msg === 'Room tidak ditemukan.') {
    return jsonError(404, 'room_not_found', msg)
  }
  if (msg === 'Room masih aktif. Akhiri sesi dulu sebelum menghapus.') {
    return jsonError(409, 'room_still_active', msg)
  }
  if (msg === 'Room baru bisa dihapus 6 jam setelah selesai.') {
    return jsonError(409, 'room_delete_cooldown', msg)
  }
  if (msg === 'Tidak bisa menghapus akun sendiri dari sini.') {
    return jsonError(409, 'cannot_delete_self', msg)
  }
  return jsonError(500, 'internal_error', msg)
}
