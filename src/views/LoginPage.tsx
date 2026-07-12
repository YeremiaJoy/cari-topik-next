'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const reduce = useReducedMotion()
  const { t } = useTranslation()

  // Sudah masuk → langsung ke dashboard
  useEffect(() => {
    if (user && !busy) router.replace('/room')
  }, [user, busy, router])

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        await login(tokenResponse.access_token)
        router.replace('/room')
      } catch {
        setError(true)
        setBusy(false)
      }
    },
    onError: () => {
      setError(true)
      setBusy(false)
    },
  })

  const handleLogin = () => {
    setBusy(true)
    setError(false)
    googleLogin()
  }

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center sm:py-20">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-full max-w-sm rounded-3xl border border-cream-200 bg-white p-8 shadow-warm-lg sm:p-10"
      >
        {/* Kartu mini menyembul di atas */}
        <div aria-hidden className="pointer-events-none absolute -top-7 left-1/2 flex -translate-x-1/2">
          <div className="float-slow h-12 w-9 -rotate-12 rounded-lg border-2 border-cream-200 bg-butter-100 shadow-warm-sm [--float-rotate:-12deg]" />
          <div className="float-slow -ml-3 h-12 w-9 rotate-6 rounded-lg border-2 border-terracotta-400 bg-terracotta-500 shadow-warm-sm [--float-rotate:6deg] [animation-delay:1.5s]" />
        </div>
        <h1 className="display-tight mt-3 font-display text-2xl font-black sm:text-3xl">{t('login.title')}</h1>
        <p className="mt-3 text-sm text-cocoa-500">{t('login.subtitle')}</p>
        <motion.button
          onClick={handleLogin}
          disabled={busy}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="press mt-8 flex w-full items-center justify-center gap-3 rounded-full border-2 border-cream-200 bg-cream-50 px-6 py-3.5 font-bold text-cocoa-700 shadow-warm-sm hover:border-terracotta-400 hover:bg-cream-100 disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? t('login.busy') : t('login.button')}
        </motion.button>
        {error && (
          <p role="alert" className="mt-4 text-xs font-bold text-terracotta-500">
            {t('login.error')}
          </p>
        )}
      </motion.div>
    </div>
  )
}
