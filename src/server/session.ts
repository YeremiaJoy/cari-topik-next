import { SignJWT, jwtVerify } from 'jose'
import { HttpError } from './httpError'

/** Nama cookie sesi aplikasi (JWT bertanda tangan sendiri). */
export const SESSION_COOKIE = 'session'

/** Umur sesi: 7 hari, tetap (tanpa sliding refresh). */
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60

export interface SessionPayload {
  uid: string
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new HttpError(500, 'config_error', 'SESSION_SECRET belum dikonfigurasi.')
  return new TextEncoder().encode(secret)
}

/** Tanda tangani sesi → JWT HS256 berlaku 7 hari. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecret())
}

/** Verifikasi JWT sesi; null bila tidak valid / kedaluwarsa. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.uid !== 'string') return null
    return { uid: payload.uid }
  } catch {
    return null
  }
}

/** Opsi cookie httpOnly untuk set/clear sesi. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export const SESSION_MAX_AGE = SESSION_MAX_AGE_SEC
