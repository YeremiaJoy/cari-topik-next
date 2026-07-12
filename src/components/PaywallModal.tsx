'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { formatCountdown } from '../lib/countdown'

interface Props {
  open: boolean
  reason: 'participants' | 'questions' | 'rooms' | 'install'
  /** Untuk 'questions': kapan kuota kartu terbuka lagi (ISO). */
  resetAt?: string
  onClose: () => void
}

export default function PaywallModal({ open, reason, resetAt, onClose }: Props) {
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const [countdown, setCountdown] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !resetAt) return
    const target = Date.parse(resetAt)
    const tick = () => setCountdown(formatCountdown(target - Date.now()))
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [open, resetAt])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/40 p-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={reduce ? false : { scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduce ? undefined : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-warm-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-modal-title"
          >
            {/* Kepala peach dengan kartu mengintip */}
            <div aria-hidden className="relative flex h-20 items-end justify-center gap-1 overflow-hidden bg-terracotta-100">
              <div className="h-14 w-11 -rotate-12 translate-y-4 rounded-t-lg border-2 border-terracotta-200 bg-white" />
              <div className="h-16 w-11 translate-y-3 rounded-t-lg border-2 border-terracotta-400 bg-terracotta-500" />
              <div className="h-14 w-11 rotate-12 translate-y-4 rounded-t-lg border-2 border-terracotta-200 bg-butter-100" />
            </div>
            <div className="p-6 sm:p-8">
              <h2 id="paywall-modal-title" className="display-tight font-display text-xl font-black sm:text-2xl">
                {t(`paywall.${reason}.title`)}
              </h2>
              <p className="mt-3 text-cocoa-500">{t(`paywall.${reason}.body`)}</p>
              {reason === 'questions' && resetAt && countdown && (
                <p className="mt-2 text-sm font-semibold tabular-nums text-terracotta-600">
                  {t('paywall.questions.reset', { time: countdown })}
                </p>
              )}
              <Link
                href="/pricing"
                className="press mt-6 inline-block w-full rounded-full bg-terracotta-500 px-6 py-3.5 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
              >
                {t('paywall.upgrade')}
              </Link>
              <button
                onClick={onClose}
                className="press mt-3 w-full rounded-md text-sm text-cocoa-500 hover:text-cocoa-700"
              >
                {t('paywall.later')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
