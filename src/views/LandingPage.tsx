'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useAuth } from '../context/AuthContext'
import { resolveInstallGate } from '../lib/installGate'
import PaywallModal from '../components/PaywallModal'
import Illustration from '../components/Illustration'

const SAMPLE_CARDS = [
  { key: 'landing.sample1', depth: 'ringan', rotate: -8, chip: 'bg-butter-100 text-cocoa-700' },
  { key: 'landing.sample2', depth: 'sedang', rotate: 0, chip: 'bg-terracotta-100 text-terracotta-700' },
  { key: 'landing.sample3', depth: 'dalam', rotate: 8, chip: 'bg-terracotta-500 text-white' },
] as const

/** Kategori — kartu foto diganti slot ilustrasi vektor. */
const FOR_WHO = [
  { cat: 'pasangan', illo: 'category-couple', emoji: '💘' },
  { cat: 'teman', illo: 'category-friends', emoji: '🎈' },
  { cat: 'keluarga', illo: 'category-family', emoji: '🏡' },
] as const

const STEPS = [1, 2, 3] as const

export default function LandingPage() {
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const { user } = useAuth()
  const [installHint, setInstallHint] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const router = useRouter()

  const ctaTo = user ? '/room' : '/login'
  const ctaLabel = user ? t('landing.heroCtaLoggedIn') : t('landing.heroCta')

  const handleInstall = async () => {
    const gate = resolveInstallGate(user)
    if (gate === 'login') {
      router.push('/login')
      return
    }
    if (gate === 'paywall') {
      setPaywall(true)
      return
    }
    if (canInstall) {
      await promptInstall()
    } else {
      setInstallHint(true)
    }
  }

  return (
    <div className="flex flex-col gap-16 py-4 sm:gap-24 sm:py-8">
      {/* Hero — terpusat, ilustrasi di bawah headline */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto flex max-w-2xl flex-col items-center text-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-200 bg-terracotta-100/60 px-3 py-1 text-xs font-bold text-terracotta-700">
          <span aria-hidden>🃏</span> {t('landing.badge')}
        </span>
        <h1 className="display-tight mt-5 font-display text-4xl font-black italic sm:text-6xl">
          {t('landing.heroTitlePrefix')}{' '}
          <span className="not-italic text-terracotta-500">{t('landing.heroTitleAccent')}</span>
        </h1>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
          className="mt-8 w-full max-w-lg"
        >
          <Illustration
            name="hero-conversation"
            ext="jpg"
            alt={t('landing.heroImageAlt')}
            emoji="🗣️"
            fit="cover"
            className="aspect-[3/2] w-full"
          />
        </motion.div>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-cocoa-500 sm:text-lg">
          {t('landing.heroBody')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={ctaTo}
            className="btn-tactile inline-block rounded-full bg-terracotta-500 px-10 py-4 text-base font-bold text-white hover:bg-terracotta-600 sm:text-lg"
          >
            {ctaLabel}
          </Link>
          <Link
            href="/pricing"
            className="press rounded-md font-semibold text-cocoa-700 underline decoration-terracotta-400 decoration-2 underline-offset-4 hover:text-terracotta-600"
          >
            {t('landing.ctaSecondary')}
          </Link>
        </div>
      </motion.section>

      {/* Kartu contoh — ringan → dalam */}
      <section aria-label={t('landing.fanLabel')} className="flex justify-center px-2">
        <div className="flex items-start justify-center gap-3 pt-4 pb-4 sm:gap-4">
          {SAMPLE_CARDS.map(({ key, depth, rotate, chip }, i) => (
            <motion.div
              key={key}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: i === 1 ? -12 : 0, rotate }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}
              whileHover={reduce ? undefined : { y: -18, rotate: 0, scale: 1.05, zIndex: 10 }}
              className="w-28 shrink-0 rounded-2xl border border-cream-200 bg-white p-3 shadow-warm-md sm:w-44 sm:rounded-3xl sm:p-5"
            >
              <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${chip}`}>
                {t(`depth.${depth}`)}
              </span>
              <p className="mt-2.5 font-display text-xs leading-snug text-cocoa-900 sm:mt-3 sm:text-base">
                {t(key)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Untuk siapa — trio kartu kategori dengan ilustrasi */}
      <section className="mx-auto w-full max-w-3xl">
        <h2 className="display-tight text-center font-display text-2xl font-bold sm:text-4xl">
          {t('landing.forWhoTitle')}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {FOR_WHO.map(({ cat, illo, emoji }, i) => (
            <motion.figure
              key={cat}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, duration: 0.45 }}
              className="overflow-hidden rounded-3xl border border-cream-200 bg-white p-4 text-center shadow-warm-md"
            >
              <Illustration
                name={illo}
                alt={t(`landing.forWhoAlt.${cat}`)}
                emoji={emoji}
                className="aspect-[5/4] w-full"
              />
              <figcaption className="mt-3">
                <p className="font-bold text-cocoa-900">
                  <span aria-hidden>{emoji}</span> {t(`category.${cat}.label`)}
                </p>
                <p className="mt-0.5 text-sm text-cocoa-500">{t(`category.${cat}.desc`)}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* Cara main — stiker miring, offset */}
      <section className="mx-auto w-full max-w-3xl">
        <h2 className="display-tight text-center font-display text-2xl font-bold sm:text-4xl">
          {t('landing.howTitle')}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((n, i) => (
            <motion.div
              key={n}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, duration: 0.45 }}
              className={`rounded-3xl border border-cream-200 bg-white/70 p-6 shadow-warm-sm ${
                i === 1 ? 'sm:translate-y-6 sm:-rotate-1' : i === 2 ? 'sm:rotate-1' : 'sm:-rotate-1'
              }`}
            >
              <span className="font-display text-3xl font-black text-terracotta-400 sm:text-4xl" aria-hidden>
                {n}
              </span>
              <h3 className="mt-2 font-bold text-cocoa-900">{t(`landing.how${n}Title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-cocoa-500">{t(`landing.how${n}Body`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Keunggulan Pro: main offline + pasang sebagai aplikasi */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto grid w-full max-w-3xl items-center gap-8 rounded-[32px] border border-terracotta-200 bg-terracotta-100/60 p-6 sm:grid-cols-[1fr_auto] sm:p-10"
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-cocoa-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cream-50">
            <span aria-hidden>✦</span> {t('landing.offlineBadge')}
          </span>
          <h2 className="display-tight mt-4 font-display text-2xl font-black sm:text-4xl">
            {t('landing.offlineTitle')}
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-cocoa-700">{t('landing.offlineBody')}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={handleInstall}
              disabled={installed}
              className="btn-tactile-cocoa inline-flex items-center gap-2 rounded-full bg-cocoa-900 px-6 py-3 font-bold text-cream-50 hover:bg-cocoa-700 disabled:opacity-60"
            >
              <span aria-hidden>⬇</span>
              {installed ? t('landing.installedLabel') : t('landing.installCta')}
            </button>
            <Link
              href="/pricing"
              className="press rounded-md font-semibold text-terracotta-700 underline decoration-2 underline-offset-4 hover:text-terracotta-600"
            >
              {t('landing.ctaSecondary')}
            </Link>
          </div>
          {installHint && !canInstall && !installed && (
            <p role="status" className="mt-3 max-w-md text-sm text-cocoa-500">
              {t('landing.installHint')}
            </p>
          )}
          <PaywallModal open={paywall} reason="install" onClose={() => setPaywall(false)} />
        </div>

        {/* Ponsel mini dengan kartu — mode offline */}
        <div aria-hidden className="mx-auto flex justify-center">
          <div className="float-slow relative h-56 w-32 rounded-[2rem] border-4 border-cocoa-900 bg-white p-3 shadow-warm-lg [--float-rotate:3deg]">
            <div className="absolute left-1/2 top-1.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-cream-200" />
            <div className="mt-4 flex justify-end">
              <span className="rounded-md bg-cream-100 px-1.5 py-0.5 text-[9px] font-bold text-cocoa-500">
                📴 offline
              </span>
            </div>
            <div className="mt-3 -rotate-3 rounded-xl border border-cream-200 bg-cream-50 p-2 shadow-warm-sm">
              <div className="h-1.5 w-8 rounded-full bg-terracotta-400" />
              <div className="mt-2 h-1 w-full rounded-full bg-cream-200" />
              <div className="mt-1 h-1 w-4/5 rounded-full bg-cream-200" />
              <div className="mt-1 h-1 w-3/5 rounded-full bg-cream-200" />
            </div>
            <div className="mt-3 h-6 rounded-full bg-terracotta-500" />
          </div>
        </div>
      </motion.section>

      {/* Ajakan terakhir */}
      <section className="relative overflow-hidden rounded-[32px] bg-cocoa-900 px-6 py-12 text-center shadow-warm-lg sm:px-10 sm:py-16">
        <div aria-hidden className="confetti-bg absolute inset-0 opacity-30" />
        <div className="relative">
          <h2 className="display-tight font-display text-2xl font-bold text-cream-50 sm:text-4xl">
            {t('landing.finalTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-cream-200">{t('landing.finalBody')}</p>
          <Link
            href={ctaTo}
            className="btn-tactile mt-8 inline-block rounded-full bg-terracotta-500 px-10 py-4 text-base font-bold text-white hover:bg-terracotta-400 sm:text-lg"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>
    </div>
  )
}
