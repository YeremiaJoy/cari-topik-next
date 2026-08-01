'use client'

import { useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { appConfig, paymentService } from '../services'
import { formatRupiah } from '../services/types'

const SNAP_JS_SRC =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

/** Poin per plan — daftar fitur nyata masing-masing (positif, bukan disamakan). */
const FREE_BULLETS = [
  'pricing.freeRooms',
  'pricing.freePairOnly',
  'pricing.freeQuestions',
  'pricing.feature.personality',
] as const
const PRO_BULLETS = [
  'pricing.unlimitedRooms',
  'pricing.proModes',
  'pricing.unlimitedQuestions',
  'paywall.perk.offline',
] as const

function PerkRow({ labelKey, tone }: { labelKey: string; tone: 'free' | 'pro' }) {
  const { t } = useTranslation()
  const pro = tone === 'pro'
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          pro ? 'bg-terracotta-500 text-white' : 'bg-cream-200 text-cocoa-700'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className={`text-sm ${pro ? 'font-semibold text-cocoa-900' : 'text-cocoa-700'}`}>
        {t(labelKey)}
      </span>
    </li>
  )
}

export default function PricingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState(false)
  const reduce = useReducedMotion()
  const { t } = useTranslation()

  const handleUpgrade = async () => {
    setConfirmOpen(false)
    setError(false)
    setBusy(true)
    try {
      const { token, referenceId } = await paymentService.createCharge('pro')
      window.snap?.pay(token, {
        onSuccess: () => router.push(`/profile?ref=${referenceId}`),
        onPending: () => router.push(`/profile?ref=${referenceId}`),
        onError: () => {
          setError(true)
          setBusy(false)
        },
        onClose: () => setBusy(false),
      })
    } catch {
      setError(true)
      setBusy(false)
    }
  }

  const isPro = user?.plan === 'pro'
  const { proPrice, proPriceAfterDiscount } = appConfig.get()
  const discountPercent = Math.round((1 - proPriceAfterDiscount / proPrice) * 100)

  const proCta = isPro ? (
    <span className="block w-full rounded-full bg-terracotta-100 px-6 py-3.5 text-center text-sm font-bold text-terracotta-700">
      {t('pricing.alreadyPro')}
    </span>
  ) : !user ? (
    <Link
      href="/login"
      className="btn-tactile block w-full rounded-full bg-terracotta-500 px-6 py-3.5 text-center font-bold text-white hover:bg-terracotta-600"
    >
      {t('pricing.loginToUpgrade')}
    </Link>
  ) : (
    <button
      onClick={() => setConfirmOpen(true)}
      disabled={busy}
      className="btn-tactile w-full rounded-full bg-terracotta-500 px-6 py-3.5 font-bold text-white hover:bg-terracotta-600 disabled:opacity-60"
    >
      {busy ? t('pricing.processing') : t('pricing.upgrade')} <span aria-hidden>👑</span>
    </button>
  )

  return (
    <div className="flex flex-col items-center gap-10 py-4 sm:py-6">
      <Script
        src={SNAP_JS_SRC}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <div className="max-w-xl text-center">
        <h1 className="display-tight font-display text-3xl font-black italic sm:text-5xl">
          {t('pricing.title')}
        </h1>
        <p className="mt-3 text-base text-cocoa-500 sm:text-lg">{t('pricing.subtitle')}</p>
      </div>

      {error && (
        <p
          role="alert"
          className="w-full max-w-3xl rounded-2xl border border-terracotta-400 bg-terracotta-100 px-5 py-3 text-center text-sm font-semibold text-terracotta-700"
        >
          {t('pricing.upgradeFailed')}
        </p>
      )}

      {/* Dua kartu plan */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-3xl gap-5 sm:grid-cols-2"
      >
        {/* Gratis */}
        <div className="flex flex-col rounded-[28px] border border-cream-200 bg-white p-6 shadow-warm-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold sm:text-2xl">{t('pricing.tierFree')}</h2>
            <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cocoa-500">
              {t('pricing.freeForever')}
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-black tabular-nums">{t('pricing.priceFree')}</p>
          <ul className="mt-5 flex flex-1 flex-col gap-3">
            {FREE_BULLETS.map((k) => (
              <PerkRow key={k} labelKey={k} tone="free" />
            ))}
          </ul>
          <Link
            href={user ? '/room' : '/login'}
            className="press mt-5 block w-full rounded-full border-2 border-cream-200 bg-white px-6 py-3 text-center font-bold text-cocoa-700 hover:bg-cream-100"
          >
            {t('pricing.startFree')}
          </Link>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col overflow-hidden rounded-[28px] border-2 border-terracotta-500 bg-white p-6 shadow-warm-md">
          <span className="absolute right-[-38px] top-5 rotate-45 bg-terracotta-500 px-10 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-warm-sm">
            {t('pricing.popular')}
          </span>
          <h2 className="font-display text-xl font-bold text-terracotta-600 sm:text-2xl">
            {t('pricing.tierPro')}
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-cocoa-500 line-through tabular-nums">
              {formatRupiah(proPrice)}
            </span>
            <span className="rounded-full bg-butter-100 px-2 py-0.5 text-[10px] font-black text-cocoa-900">
              {t('pricing.save', { pct: discountPercent })}
            </span>
          </div>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-terracotta-600">
            {formatRupiah(proPriceAfterDiscount)}
          </p>
          <p className="text-xs font-semibold text-cocoa-500">{t('pricing.perYear')}</p>
          <ul className="mt-5 flex flex-1 flex-col gap-3">
            {PRO_BULLETS.map((k) => (
              <PerkRow key={k} labelKey={k} tone="pro" />
            ))}
          </ul>
          <div className="mt-5">{proCta}</div>
        </div>
      </motion.div>

      {/* Dialog konfirmasi upgrade */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/50 p-6 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={reduce ? false : { scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={reduce ? undefined : { scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-warm-lg sm:p-8"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-upgrade-title"
            >
              <span aria-hidden className="text-3xl">✨</span>
              <h2 id="confirm-upgrade-title" className="mt-2 font-display text-xl font-bold sm:text-2xl">
                {t('pricing.confirmTitle')}
              </h2>
              <p className="mt-3 text-sm text-cocoa-500">
                {t('pricing.confirmUpgrade', { price: formatRupiah(proPriceAfterDiscount) })}
              </p>
              <button
                onClick={handleUpgrade}
                className="btn-tactile mt-6 w-full rounded-full bg-terracotta-500 px-6 py-3.5 font-bold text-white hover:bg-terracotta-600"
              >
                {t('pricing.confirmYes')}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="press mt-3 w-full rounded-md text-sm text-cocoa-500 hover:text-cocoa-700"
              >
                {t('pricing.confirmNo')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
