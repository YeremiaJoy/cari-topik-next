import type { AuthService, User } from '../types'
import { api, ApiError } from './client'
import { supabaseBrowser } from '../../lib/supabase/browser'

export function createHttpAuthService(): AuthService {
  return {
    async getCurrentUser() {
      try {
        return await api<User>('/api/me')
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) return null
        throw err
      }
    },
    async loginWithGoogle() {
      const supabase = supabaseBrowser()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/room` },
      })
      if (error) throw error
      // Browser sedang redirect ke Google; promise ini sengaja tidak pernah selesai.
      return new Promise<User>(() => {})
    },
    async logout() {
      await supabaseBrowser().auth.signOut()
    },
    async upgradeToPro() {
      return api<User>('/api/me/upgrade', { method: 'POST' })
    },
    async deleteAccount() {
      await api<void>('/api/me', { method: 'DELETE' })
      await supabaseBrowser().auth.signOut()
    },
  }
}
