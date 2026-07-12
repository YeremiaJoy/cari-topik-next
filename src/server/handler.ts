import { NextResponse } from 'next/server'
import { HttpError } from './auth'
import { jsonError, mapSupabaseError } from './errors'

/**
 * Bungkus handler API: HttpError → status-nya, error Supabase (dilempar
 * sebagai objek {message, details}) → mapSupabaseError, sisanya 500.
 */
export async function withErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonError(err.statusCode, err.code, err.message)
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return mapSupabaseError(err as { message: string; details?: string | null })
    }
    return jsonError(500, 'internal_error', 'Terjadi kesalahan.')
  }
}
