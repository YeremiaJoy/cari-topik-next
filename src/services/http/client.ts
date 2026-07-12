import { PaywallError } from '../types'

interface ApiErrorBody {
  statusCode?: number
  code?: string
  message?: string
  resetAt?: string
}

export class ApiError extends Error {
  statusCode: number
  code: string
  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * fetch ke API route + kontrak error bersama:
 * 402 paywall:* → PaywallError (resetAt untuk 'questions'), sisanya ApiError.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 204) return undefined as T
  if (res.ok) return (await res.json()) as T

  const body = (await res.json().catch(() => ({}))) as ApiErrorBody
  const code = body.code ?? 'internal_error'
  if (code === 'paywall:participants') throw new PaywallError('participants')
  if (code === 'paywall:rooms') throw new PaywallError('rooms')
  if (code === 'paywall:questions') throw new PaywallError('questions', body.resetAt)
  throw new ApiError(res.status, code, body.message ?? res.statusText)
}
