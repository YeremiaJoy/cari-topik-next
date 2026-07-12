import type { AuthService, User } from '../types'
import { api, ApiError } from './client'

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
    async loginWithGoogle(accessToken: string) {
      return api<User>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ accessToken }),
      })
    },
    async logout() {
      await api<void>('/api/auth/logout', { method: 'POST' })
    },
    async deleteAccount() {
      await api<void>('/api/me', { method: 'DELETE' })
    },
  }
}
