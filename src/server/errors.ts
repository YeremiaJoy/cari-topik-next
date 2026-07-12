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
