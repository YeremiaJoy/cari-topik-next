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

const FITUR = [
  { key: 'rooms', freeKey: 'pricing.freeRooms', proKey: 'pricing.unlimited' },
  { key: 'mode', freeKey: 'pricing.freePairOnly', proKey: 'pricing.proModes' },
  { key: 'questions', freeKey: 'pricing.freeQuestions', proKey: 'pricing.unlimited' },
  { key: 'personality', freeKey: null, proKey: null },
  { key: 'offline', freeKey: 'pricing.notIncluded', proKey: null },
] as const

const ROW = 'grid grid-cols-[1.2fr_1fr_1fr] sm:grid-cols-[1.5fr_1fr_1fr]'

function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-4 w-4 ${className ?? ''}`}
    >
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
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
      // Plan sesungguhnya baru ter-grant setelah webhook Midtrans diproses —
      // jangan tunggu di sini, arahkan langsung ke profil dan biarkan halaman
      // itu polling status transaksi sampai webhook selesai diproses.
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
  const proCell = 'bg-terracotta-500/[0.05]'
  const { proPrice, proPriceAfterDiscount } = appConfig.get()
  const discountPercent = Math.round((1 - proPriceAfterDiscount / proPrice) * 100)

  return (
    <div className="flex flex-col items-center gap-8 py-4 sm:gap-10 sm:py-6">
      <Script
        src={SNAP_JS_SRC}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <div className="max-w-xl text-center">
        <h1 className="display-tight font-display text-3xl font-black sm:text-5xl">
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

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-warm-sm"
      >
        {/* Header: nama plan + harga, satu baris grid supaya tinggi selalu sejajar */}
        <div className={ROW}>
          <div className="p-4 sm:p-6" />
          <div className="flex flex-col justify-end gap-1 p-4 sm:p-6">
            <h2 className="font-display text-lg font-bold sm:text-2xl">
              {t('pricing.tierFree')}
            </h2>
            <p className="font-display text-xl font-black tabular-nums sm:text-3xl">
              {t('pricing.priceFree')}
            </p>
            <p className="text-xs font-semibold text-cocoa-500">{t('pricing.perYear')}</p>
          </div>
          <div className={`flex flex-col justify-end gap-1 p-4 sm:p-6 ${proCell}`}>
            <span className="mb-1 self-start rounded-full bg-cocoa-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cream-50">
              {t('pricing.popular')}
            </span>
            <h2 className="font-display text-lg font-bold text-terracotta-600 sm:text-2xl">
              {t('pricing.tierPro')}
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-bold text-cocoa-500 line-through tabular-nums sm:text-sm">
                {formatRupiah(proPrice)}
              </span>
              <span className="rounded-full bg-butter-100 px-2 py-0.5 text-[10px] font-black text-cocoa-900 sm:text-xs">
                {t('pricing.save', { pct: discountPercent })}
              </span>
            </p>
            <p className="font-display text-xl font-black tabular-nums sm:text-3xl">
              {formatRupiah(proPriceAfterDiscount)}
            </p>
            <p className="text-xs font-semibold text-cocoa-500">{t('pricing.perYear')}</p>
          </div>
        </div>

        {/* Baris fitur: satu grid per baris, kolom identik → selalu seimbang */}
        {FITUR.map((f) => (
          <div key={f.key} className={`${ROW} border-t border-cream-200`}>
            <div className="flex items-center p-4 text-[13px] text-cocoa-500 sm:p-5 sm:px-6 sm:text-sm">
              {t(`pricing.feature.${f.key}`)}
            </div>
            <div className="flex items-center p-4 text-[13px] font-bold sm:p-5 sm:text-sm">
              {f.freeKey ? (
                <span className={f.freeKey === 'pricing.notIncluded' ? 'font-normal text-cocoa-500/60' : ''}>
                  {t(f.freeKey)}
                </span>
              ) : (
                <Check className="text-cocoa-700" />
              )}
            </div>
            <div className={`flex items-center p-4 text-[13px] font-bold sm:p-5 sm:text-sm ${proCell}`}>
              {f.proKey ? t(f.proKey) : <Check className="text-terracotta-600" />}
            </div>
          </div>
        ))}

        {/* CTA per kolom */}
        <div className={`${ROW} border-t border-cream-200`}>
          <div className="p-4 sm:p-6" />
          <div className="flex items-center p-4 sm:p-6">
            <Link
              href={user ? '/room' : '/login'}
              className="press w-full rounded-full border-2 border-cream-200 bg-cream-50 px-4 py-2.5 text-center text-sm font-bold text-cocoa-700 hover:bg-cream-100"
            >
              {t('pricing.startFree')}
            </Link>
          </div>
          <div className={`flex items-center p-4 sm:p-6 ${proCell}`}>
            {isPro ? (
              <p className="w-full rounded-full bg-terracotta-100 px-4 py-2.5 text-center text-sm font-bold text-terracotta-700">
                {t('pricing.alreadyPro')}
              </p>
            ) : !user ? (
              <Link
                href="/login"
                className="press w-full rounded-full bg-terracotta-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-warm-md hover:bg-terracotta-600"
              >
                {t('pricing.loginToUpgrade')}
              </Link>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                className="press w-full rounded-full bg-terracotta-500 px-4 py-2.5 text-sm font-bold text-white shadow-warm-md hover:bg-terracotta-600 disabled:opacity-60"
              >
                {busy ? t('pricing.processing') : t('pricing.upgrade')}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Dialog konfirmasi upgrade — pengganti window.confirm */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/40 p-6"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={reduce ? false : { scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={reduce ? undefined : { scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-warm-lg sm:p-8"
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
                className="press mt-6 w-full rounded-full bg-terracotta-500 px-6 py-3 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
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
