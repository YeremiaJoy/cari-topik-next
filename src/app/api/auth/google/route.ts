import { NextResponse } from 'next/server'
import { withErrors } from '@/server/handler'
import { fetchGoogleProfile } from '@/server/google'
import { assertActiveProfile, syncAuthProfile } from '@/server/db/operations'
import { toUser } from '@/server/mappers'
import { HttpError } from '@/server/httpError'
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionCookieOptions, signSession } from '@/server/session'

/** Tukar access token Google → profil Neon + set cookie sesi aplikasi. */
export async function POST(request: Request) {
  return withErrors(async () => {
    const body = await request.json().catch(() => null)
    const accessToken = body?.accessToken
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new HttpError(400, 'validation_error', 'accessToken wajib.')
    }

    const google = await fetchGoogleProfile(accessToken)
    const profile = await syncAuthProfile({
      sub: google.sub,
      name: google.name,
      email: google.email,
      avatarUrl: google.picture,
    })
    assertActiveProfile(profile)

    const token = await signSession({ uid: profile.id })
    const res = NextResponse.json(toUser(profile))
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE))
    return res
  })
}
