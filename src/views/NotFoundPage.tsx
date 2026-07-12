'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const reduce = useReducedMotion()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-6 py-14 text-center sm:py-24">
      {/* Kartu nyasar */}
      <motion.div
        aria-hidden
        initial={reduce ? false : { opacity: 0, rotate: 0, y: -20 }}
        animate={{ opacity: 1, rotate: -8, y: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12 }}
        className="flex h-36 w-28 items-center justify-center rounded-3xl border border-cream-200 bg-white shadow-warm-md"
      >
        <span className="font-display text-5xl font-black text-terracotta-400">?</span>
      </motion.div>
      <h1 className="display-tight font-display text-3xl font-black sm:text-5xl">
        {t('notFound.title')}
      </h1>
      <p className="max-w-sm text-cocoa-500">{t('notFound.body')}</p>
      <Link
        href="/"
        className="press rounded-full bg-terracotta-500 px-8 py-3.5 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  )
}
