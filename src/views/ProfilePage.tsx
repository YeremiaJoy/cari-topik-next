'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { appConfig } from '../services'
import { formatRupiah } from '../services/types'
import { useLang, localeTag } from '../i18n/useLang'

function formatTanggal(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
  const { user, logout, deleteAccount } = useAuth()
  const router = useRouter()
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const { lang, setLang } = useLang()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      router.replace('/')
    } finally {
      setDeleting(false)
    }
  }

  const isPro = user.plan === 'pro'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex max-w-xl flex-col gap-6"
    >
      <h1 className="display-tight font-display text-3xl font-black sm:text-5xl">
        {t('profile.title')}
      </h1>

      {/* Identitas */}
      <section className="flex items-center gap-4 rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm sm:p-8">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 -rotate-3 items-center justify-center rounded-2xl bg-terracotta-500 font-display text-2xl font-black text-white shadow-warm-sm"
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold sm:text-2xl">{user.name}</p>
          <p className="truncate text-sm text-cocoa-500">{user.email}</p>
          <p className="mt-1 text-xs text-cocoa-500">
            {t('profile.memberSince', { date: formatTanggal(user.createdAt, localeTag(lang)) })}
          </p>
        </div>
      </section>

      {/* Paket */}
      <section
        className={
          isPro
            ? 'rounded-3xl bg-terracotta-500 p-6 text-white shadow-warm-md sm:p-8'
            : 'rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm sm:p-8'
        }
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold sm:text-xl">{t('profile.planTitle')}</h2>
          <span
            className={
              isPro
                ? 'rounded-full bg-white/20 px-3 py-1 text-xs font-bold'
                : 'rounded-full bg-cream-200 px-3 py-1 text-xs font-bold text-cocoa-700'
            }
          >
            {isPro ? t('nav.planPro') : t('nav.planFree')}
          </span>
        </div>
        <p className={`mt-2 text-sm ${isPro ? 'text-terracotta-100' : 'text-cocoa-500'}`}>
          {isPro
            ? t('profile.planProDesc', { price: formatRupiah(appConfig.get().proPriceAfterDiscount) })
            : t('profile.planFreeDesc')}
        </p>
        {!isPro && (
          <Link
            href="/pricing"
            className="press mt-5 inline-block rounded-full bg-terracotta-500 px-6 py-2.5 font-bold text-white shadow-warm-sm hover:bg-terracotta-600"
          >
            {t('paywall.upgrade')}
          </Link>
        )}
      </section>

      {/* Bahasa */}
      <section className="rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm sm:p-8">
        <h2 className="font-display text-lg font-bold sm:text-xl">{t('profile.langTitle')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(['id', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`press rounded-2xl border-2 px-4 py-3 font-bold ${
                lang === l
                  ? 'border-terracotta-500 bg-terracotta-100/60'
                  : 'border-cream-200 bg-white text-cocoa-500 hover:border-terracotta-400'
              }`}
            >
              {t(`profile.lang.${l}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Keluar */}
      <button
        onClick={handleLogout}
        className="press w-full rounded-full border-2 border-cream-200 px-6 py-3 font-bold text-cocoa-700 hover:bg-cream-100"
      >
        {t('nav.logout')}
      </button>

      {/* Zona berbahaya */}
      <section className="rounded-3xl border-2 border-dashed border-terracotta-400/60 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-terracotta-700 sm:text-xl">
          {t('profile.dangerTitle')}
        </h2>
        <p className="mt-2 text-sm text-cocoa-500">{t('profile.deleteWarning')}</p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="press mt-5 rounded-full border-2 border-terracotta-700 px-6 py-2.5 font-bold text-terracotta-700 hover:bg-terracotta-700 hover:text-white"
        >
          {t('profile.deleteAccount')}
        </button>
      </section>

      {/* Dialog konfirmasi hapus akun */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/40 p-6 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
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
              aria-labelledby="delete-account-title"
            >
              <span aria-hidden className="text-3xl">🗑️</span>
              <h2 id="delete-account-title" className="mt-2 font-display text-xl font-bold sm:text-2xl">
                {t('profile.deleteConfirmTitle')}
              </h2>
              <p className="mt-3 text-sm text-cocoa-500">{t('profile.deleteWarning')}</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="press mt-6 w-full rounded-full bg-terracotta-700 px-6 py-3 font-bold text-white shadow-warm-md hover:bg-terracotta-600 disabled:opacity-60"
              >
                {deleting ? t('profile.deleting') : t('profile.deleteConfirmYes')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="press mt-3 w-full rounded-md text-sm text-cocoa-500 hover:text-cocoa-700 disabled:opacity-60"
              >
                {t('pricing.confirmNo')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
