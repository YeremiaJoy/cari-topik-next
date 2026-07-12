'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../services/types'
import { authService } from '../services'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (accessToken: string) => Promise<void>
  logout: () => Promise<void>
  upgrade: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const value: AuthValue = {
    user,
    loading,
    login: async (accessToken: string) => setUser(await authService.loginWithGoogle(accessToken)),
    logout: async () => {
      await authService.logout()
      setUser(null)
    },
    upgrade: async () => setUser(await authService.upgradeToPro()),
    deleteAccount: async () => {
      await authService.deleteAccount()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
