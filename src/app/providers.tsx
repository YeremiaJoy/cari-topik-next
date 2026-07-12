'use client'

import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { GoogleOAuthProvider } from '@react-oauth/google'
import i18n from '../i18n'
import { AuthProvider } from '../context/AuthContext'

export function Providers({ children }: { children: ReactNode }) {
  console.log(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
      </I18nextProvider>
    </GoogleOAuthProvider>
  )
}
