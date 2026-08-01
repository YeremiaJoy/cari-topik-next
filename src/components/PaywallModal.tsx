'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { formatCountdown } from '../lib/countdown'
import { appConfig } from '../services'
import { formatRupiah } from '../services/types'
import Illustration from './Illustration'

interface Props {
  open: boolean
  reason: 'participants' | 'questions' | 'rooms' | 'install' | 'flagMode'
  /** Untuk 'questions': kapan kuota kartu terbuka lagi (ISO). */
  resetAt?: string
  onClose: () => void
}

const PERKS = ['questions', 'group', 'offline', 'personality'] as const

function CheckBadge() {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta-500"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
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

  const price = formatRupiah(appConfig.get().proPriceAfterDiscount)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa-900/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-md overflow-hidden rounded-[32px] bg-white p-6 text-center shadow-warm-lg sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-modal-title"
          >
            <Illustration
              name="paywall-connection"
              alt=""
              emoji="🔒"
              className="mx-auto aspect-[4/3] max-h-44 w-full"
            />

            <h2 id="paywall-modal-title" className="display-tight mt-5 font-display text-xl font-black sm:text-2xl">
              {t(`paywall.${reason}.title`)}
            </h2>
            <p className="mt-3 text-cocoa-500">{t(`paywall.${reason}.body`)}</p>
            {reason === 'questions' && resetAt && countdown && (
              <p className="mt-2 text-sm font-semibold tabular-nums text-terracotta-600">
                {t('paywall.questions.reset', { time: countdown })}
              </p>
            )}

            <ul className="mt-6 flex flex-col gap-3 text-left">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3">
                  <CheckBadge />
                  <span className="text-sm font-bold text-cocoa-900">{t(`paywall.perk.${perk}`)}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/pricing"
              className="btn-tactile mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-terracotta-500 px-6 py-4 font-bold text-white hover:bg-terracotta-600"
            >
              {t('paywall.upgradePrice', { price })} <span aria-hidden>✨</span>
            </Link>
            <div className="mt-4 flex items-center justify-center gap-6">
              <Link
                href="/pricing"
                onClick={onClose}
                className="press rounded-md text-sm font-semibold text-terracotta-600 underline underline-offset-4 hover:text-terracotta-700"
              >
                {t('paywall.startFree')}
              </Link>
              <button
                onClick={onClose}
                className="press rounded-md text-sm text-cocoa-500 hover:text-cocoa-700"
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
