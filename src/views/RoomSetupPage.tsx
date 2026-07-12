'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { appConfig, roomService } from '../services'
import { PaywallError } from '../services/types'
import type { Category, Personality } from '../services/types'
import PaywallModal from '../components/PaywallModal'

const KATEGORI: { value: Category; emoji: string }[] = [
  { value: 'pasangan', emoji: '💘' },
  { value: 'teman', emoji: '🎈' },
  { value: 'keluarga', emoji: '🏡' },
]
const MODE: { value: 'pair' | 'group'; emoji: string; count: number }[] = [
  { value: 'pair', emoji: '💬', count: 2 },
  { value: 'group', emoji: '🎉', count: 3 },
]
const KEPRIBADIAN: { value: Personality; emoji: string }[] = [
  { value: 'introvert', emoji: '🌙' },
  { value: 'extrovert', emoji: '⚡' },
]

export default function RoomSetupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState<Category>('pasangan')
  const [participantCount, setParticipantCount] = useState(2)
  const [personalities, setPersonalities] = useState<[Personality, Personality]>(['introvert', 'introvert'])
  const [paywall, setPaywall] = useState(false)
  const [paywallReason, setPaywallReason] = useState<'participants' | 'rooms'>('participants')
  const [busy, setBusy] = useState(false)

  const isFree = user?.plan === 'free'
  const nextFromStep1 = () => setStep(participantCount === 2 ? 2 : 3)

  const handlePickCount = (n: number) => {
    if (isFree && n > appConfig.get().freeMaxParticipants) {
      setPaywallReason('participants')
      setPaywall(true)
      return
    }
    setParticipantCount(n)
  }

  const handleStart = async () => {
    setBusy(true)
    try {
      const room = await roomService.createRoom({
        participantCount,
        category,
        personalities: participantCount === 2 ? personalities : undefined,
      })
      router.push(`/room/${room.id}`)
    } catch (err) {
      if (err instanceof PaywallError) {
        setPaywallReason(err.reason === 'rooms' ? 'rooms' : 'participants')
        setPaywall(true)
      } else throw err
    } finally {
      setBusy(false)
    }
  }

  const stepVariants = reduce
    ? {}
    : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 } }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/room"
        className="press mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-cocoa-500 hover:text-terracotta-600"
      >
        <span aria-hidden>←</span> {t('setup.exit')}
      </Link>

      {/* Indikator langkah */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-cocoa-500">
          {t('setup.stepOf', { n: step })}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              animate={{ scaleY: s === step && !reduce ? 1.4 : 1 }}
              className={`h-1.5 flex-1 origin-center rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-terracotta-500' : 'bg-cream-200'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section key="langkah-1" {...stepVariants} transition={{ duration: 0.3 }}>
            <h1 className="display-tight font-display text-2xl font-black sm:text-4xl">
              {t('setup.categoryTitle')}
            </h1>
            <div className="mt-6 grid gap-3">
              {KATEGORI.map(({ value, emoji }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={`press flex items-center gap-4 rounded-2xl border-2 p-4 text-left sm:p-5 ${
                    category === value
                      ? 'border-terracotta-500 bg-terracotta-100/60 shadow-warm-sm'
                      : 'border-cream-200 bg-white hover:border-terracotta-400 hover:shadow-warm-sm'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform ${
                      category === value ? 'scale-110 bg-white' : 'bg-cream-100'
                    }`}
                  >
                    {emoji}
                  </span>
                  <span className="flex-1">
                    <span className="font-bold">{t(`category.${value}.label`)}</span>
                    <p className="text-sm text-cocoa-500">{t(`category.${value}.desc`)}</p>
                  </span>
                  {category === value && (
                    <span aria-hidden className="text-lg font-black text-terracotta-500">✓</span>
                  )}
                </button>
              ))}
            </div>

            <h2 className="mt-8 font-display text-lg font-bold sm:text-xl">{t('setup.modeTitle')}</h2>
            <div className="mt-4 grid gap-3">
              {MODE.map(({ value, emoji, count }) => {
                const active = (participantCount === 2) === (value === 'pair')
                return (
                  <button
                    key={value}
                    onClick={() => handlePickCount(count)}
                    aria-pressed={active}
                    className={`press flex items-center gap-4 rounded-2xl border-2 p-4 text-left sm:p-5 ${
                      active
                        ? 'border-terracotta-500 bg-terracotta-100/60 shadow-warm-sm'
                        : 'border-cream-200 bg-white hover:border-terracotta-400 hover:shadow-warm-sm'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform ${
                        active ? 'scale-110 bg-white' : 'bg-cream-100'
                      }`}
                    >
                      {emoji}
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2 font-bold">
                        {t(`setup.mode.${value}.label`)}
                        {value === 'group' && isFree && (
                          <span className="rounded-full bg-butter-100 px-2 py-0.5 text-xs font-bold text-cocoa-700">
                            {t('setup.proBadge')}
                          </span>
                        )}
                      </span>
                      <p className="text-sm text-cocoa-500">{t(`setup.mode.${value}.desc`)}</p>
                    </span>
                    {active && (
                      <span aria-hidden className="text-lg font-black text-terracotta-500">✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={nextFromStep1}
              className="press mt-10 w-full rounded-full bg-terracotta-500 px-6 py-3.5 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
            >
              {t('setup.next')}
            </button>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section key="langkah-2" {...stepVariants} transition={{ duration: 0.3 }}>
            <h1 className="display-tight font-display text-2xl font-black sm:text-4xl">
              {t('setup.personalityTitle')}
            </h1>
            <p className="mt-2 text-cocoa-500">{t('setup.personalitySubtitle')}</p>
            {[0, 1].map((idx) => (
              <div key={idx} className="mt-6">
                <h2 className="font-bold">{t('setup.participantN', { n: idx + 1 })}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {KEPRIBADIAN.map(({ value, emoji }) => (
                    <button
                      key={value}
                      onClick={() =>
                        setPersonalities((prev) =>
                          idx === 0 ? [value, prev[1]] : [prev[0], value],
                        )
                      }
                      aria-pressed={personalities[idx] === value}
                      className={`press rounded-2xl border-2 p-4 text-left ${
                        personalities[idx] === value
                          ? 'border-terracotta-500 bg-terracotta-100/60 shadow-warm-sm'
                          : 'border-cream-200 bg-white hover:border-terracotta-400'
                      }`}
                    >
                      <span aria-hidden className="text-xl">{emoji}</span>
                      <span className="mt-1 block font-bold">{t(`personality.${value}.label`)}</span>
                      <p className="text-sm text-cocoa-500">{t(`personality.${value}.desc`)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="press flex-1 rounded-full border-2 border-cream-200 px-6 py-3 font-bold text-cocoa-700 hover:bg-cream-100"
              >
                {t('setup.back')}
              </button>
              <button
                onClick={() => setStep(3)}
                className="press flex-1 rounded-full bg-terracotta-500 px-6 py-3 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
              >
                {t('setup.next')}
              </button>
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section key="langkah-3" {...stepVariants} transition={{ duration: 0.3 }} className="text-center">
            <span aria-hidden className="text-4xl">🎉</span>
            <h1 className="display-tight mt-2 font-display text-2xl font-black sm:text-4xl">
              {t('setup.readyTitle')}
            </h1>
            {/* Kartu ringkasan gaya tiket */}
            <div className="mx-auto mt-6 max-w-sm -rotate-1 rounded-3xl border border-cream-200 bg-white p-6 text-left shadow-warm-md sm:p-8">
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-cocoa-500">{t('setup.summaryCategory')}</dt>
                  <dd className="font-bold">
                    {KATEGORI.find((k) => k.value === category)?.emoji}{' '}
                    {t(`category.${category}.label`)}
                  </dd>
                </div>
                <div className="border-t border-dashed border-cream-200" />
                <div className="flex justify-between">
                  <dt className="text-cocoa-500">{t('setup.summaryParticipants')}</dt>
                  <dd className="font-bold">
                    {t(participantCount === 2 ? 'common.modePair' : 'common.modeGroup')}
                  </dd>
                </div>
                {participantCount === 2 && (
                  <>
                    <div className="border-t border-dashed border-cream-200" />
                    <div className="flex justify-between">
                      <dt className="text-cocoa-500">{t('setup.summaryType')}</dt>
                      <dd className="font-bold">
                        {personalities.map((p) => t(`personality.${p}.label`)).join(' + ')}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setStep(participantCount === 2 ? 2 : 1)}
                className="press flex-1 rounded-full border-2 border-cream-200 px-6 py-3 font-bold text-cocoa-700 hover:bg-cream-100"
              >
                {t('setup.back')}
              </button>
              <button
                onClick={handleStart}
                disabled={busy}
                className="press flex-1 rounded-full bg-terracotta-500 px-6 py-3 font-bold text-white shadow-warm-md hover:bg-terracotta-600 disabled:opacity-60"
              >
                {busy ? t('setup.starting') : t('setup.start')}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <PaywallModal open={paywall} reason={paywallReason} onClose={() => setPaywall(false)} />
    </div>
  )
}
