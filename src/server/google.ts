import { HttpError } from './httpError'

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export interface GoogleProfile {
  sub: string
  email: string
  name: string
  picture: string
}

/**
 * Ambil profil Google dari access token (implicit flow @react-oauth/google).
 * Token divalidasi implisit oleh endpoint userinfo Google.
 */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  if (!accessToken) throw new HttpError(401, 'not_authenticated', 'Token Google kosong.')

  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new HttpError(401, 'not_authenticated', 'Token Google tidak valid.')

  const data = (await res.json()) as {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }
  if (!data.sub || !data.email) {
    throw new HttpError(401, 'not_authenticated', 'Profil Google tidak lengkap.')
  }

  return {
    sub: data.sub,
    email: data.email,
    name: data.name ?? data.email.split('@')[0],
    picture: data.picture ?? '',
  }
}
