import { NextResponse } from 'next/server'
import { HttpError } from './httpError'
import { jsonError } from './errors'

/**
 * Bungkus handler API: HttpError → kontrak error JSON, sisanya 500.
 */
export async function withErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonError(err.statusCode, err.code, err.message, err.resetAt)
    }
    return jsonError(500, 'internal_error', 'Terjadi kesalahan.')
  }
}
