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

const SAMPLE_CARDS = [
  { key: 'landing.sample1', depth: 'ringan', rotate: -8, chip: 'bg-butter-100 text-cocoa-700' },
  { key: 'landing.sample2', depth: 'sedang', rotate: 3, chip: 'bg-terracotta-100 text-terracotta-700' },
  { key: 'landing.sample3', depth: 'dalam', rotate: 10, chip: 'bg-terracotta-500 text-white' },
] as const

/** Foto kategori — komposisi miring & offset mengikuti bahasa kartu. */
const FOR_WHO = [
  { cat: 'pasangan', src: '/images/couple-sunset.jpg', emoji: '💘', tilt: 'sm:-rotate-2' },
  { cat: 'teman', src: '/images/friends-together.jpg', emoji: '🎈', tilt: 'sm:translate-y-6 sm:rotate-1' },
  { cat: 'keluarga', src: '/images/family-home.jpg', emoji: '🏡', tilt: 'sm:-rotate-1' },
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
      {/* Hero — split asimetris: teks kiri, foto obrolan kanan */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-200 bg-terracotta-100/60 px-3 py-1 text-xs font-bold text-terracotta-700">
            <span aria-hidden>🃏</span> {t('landing.badge')}
          </span>
          <h1 className="display-tight mt-5 font-display text-4xl font-black sm:text-6xl">
            {t('landing.heroTitlePrefix')}{' '}
            <em className="text-terracotta-500">{t('landing.heroTitleAccent')}</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cocoa-500 sm:text-lg">
            {t('landing.heroBody')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={ctaTo}
              className="press inline-block rounded-full bg-terracotta-500 px-8 py-3.5 text-base font-bold text-white shadow-warm-md hover:bg-terracotta-600 hover:shadow-warm-lg sm:text-lg"
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
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 2 }}
          transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
          className="mx-auto w-full max-w-md lg:max-w-none"
        >
          <img
            src="/images/hero-conversation.jpg"
            alt={t('landing.heroImageAlt')}
            fetchPriority="high"
            className="aspect-[4/3] w-full rounded-3xl border border-cream-200 object-cover shadow-warm-lg"
          />
        </motion.div>
      </motion.section>

      {/* Kipas kartu contoh — ringan → dalam */}
      <section aria-label={t('landing.fanLabel')} className="flex justify-center px-2">
        <div className="flex items-center pt-4 pb-8">
          {SAMPLE_CARDS.map(({ key, depth, rotate, chip }, i) => (
            <motion.div
              key={key}
              initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: i === 1 ? -12 : 0, rotate }}
              transition={{ delay: 0.25 + i * 0.15, type: 'spring', stiffness: 120, damping: 14 }}
              whileHover={reduce ? undefined : { y: -24, rotate: 0, scale: 1.05, zIndex: 10 }}
              className={`w-40 shrink-0 rounded-3xl border border-cream-200 bg-white p-4 shadow-warm-md sm:w-56 sm:p-6 ${
                i > 0 ? '-ml-10 sm:-ml-12' : ''
              }`}
            >
              <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${chip}`}>
                {t(`depth.${depth}`)}
              </span>
              <p className="mt-3 font-display text-sm leading-snug text-cocoa-900 sm:text-lg">
                {t(key)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Untuk siapa — trio foto kategori, miring & offset */}
      <section className="mx-auto w-full max-w-3xl">
        <h2 className="display-tight font-display text-2xl font-bold sm:text-4xl">
          {t('landing.forWhoTitle')}
        </h2>
        {/* Mobile: carousel geser penuh-layar; ≥sm: grid offset seperti semula */}
        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
          {FOR_WHO.map(({ cat, src, emoji, tilt }, i) => (
            <motion.figure
              key={cat}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, duration: 0.45 }}
              className={`w-[72%] shrink-0 snap-center sm:w-auto sm:shrink ${tilt}`}
            >
              <img
                src={src}
                alt={t(`landing.forWhoAlt.${cat}`)}
                loading="lazy"
                className={`aspect-[4/5] w-full rounded-3xl border border-cream-200 object-cover shadow-warm-md ${
                  i === 1 ? 'sm:aspect-[3/4]' : ''
                }`}
              />
              <figcaption className="mt-3 px-1">
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
        <h2 className="display-tight font-display text-2xl font-bold sm:text-4xl">
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
        className="mx-auto grid w-full max-w-3xl items-center gap-8 rounded-3xl border border-terracotta-200 bg-terracotta-100/60 p-6 sm:grid-cols-[1fr_auto] sm:p-10"
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
              className="press inline-flex items-center gap-2 rounded-full bg-cocoa-900 px-6 py-3 font-bold text-cream-50 shadow-warm-md hover:bg-cocoa-700 disabled:opacity-60"
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

      {/* Ajakan terakhir — foto senja + lapisan cocoa agar teks tetap kontras */}
      <section className="relative overflow-hidden rounded-3xl bg-cocoa-900 px-6 py-12 text-center shadow-warm-lg sm:px-10 sm:py-16">
        <img
          src="/images/gathering-golden.jpg"
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-cocoa-900/80" />
        <div className="relative">
          <h2 className="display-tight font-display text-2xl font-bold text-cream-50 sm:text-4xl">
            {t('landing.finalTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-cream-200">{t('landing.finalBody')}</p>
          <Link
            href={ctaTo}
            className="press mt-8 inline-block rounded-full bg-terracotta-500 px-8 py-3.5 text-base font-bold text-white shadow-warm-md hover:bg-terracotta-400 sm:text-lg"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>
    </div>
  )
}
