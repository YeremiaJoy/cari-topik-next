'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { questionService, roomService } from '../services'
import { PaywallError } from '../services/types'
import type { Room, FlagVote, PaywallReason } from '../services/types'
import { currentCardId, playedCount } from '../lib/session'
import QuestionCard from '../components/QuestionCard'
import FlagCard from '../components/FlagCard'
import PaywallModal from '../components/PaywallModal'
import Glyph from '../components/Glyph'
import { useLang } from '../i18n/useLang'

function SessionSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl" role="status" aria-label={t('common.loading')}>
      <div className="animate-pulse rounded-3xl border border-cream-200 bg-white/60 p-6 sm:p-8">
        <div className="h-4 w-28 rounded-full bg-cream-200" />
        <div className="mt-6 h-6 w-full rounded-full bg-cream-100" />
        <div className="mt-3 h-6 w-3/4 rounded-full bg-cream-100" />
      </div>
    </div>
  )
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const { lang } = useLang()
  const { user } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [resetAt, setResetAt] = useState<string | undefined>()
  const [advancing, setAdvancing] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('questions')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    roomService.getRoom(id).then((r) => (r ? setRoom(r) : setNotFound(true)))
  }, [id])

  useEffect(() => {
    if (notFound) router.replace('/room')
  }, [notFound, router])

  useEffect(() => {
    if (
      room &&
      room.status === 'active' &&
      !questionService.getById(currentCardId(room) ?? '')
    ) {
      router.replace('/room')
    }
  }, [room, router])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  if (!room) return <SessionSkeleton />

  if (room.status === 'completed') {
    const favorit = room.favorites
      .map((qid) => questionService.getById(qid))
      .filter((q) => q !== undefined)
    const count = playedCount(room)
    const minutes = room.endedAt
      ? Math.max(0, Math.round((Date.parse(room.endedAt) - Date.parse(room.createdAt)) / 60000))
      : 0
    // Kartu flag yang di-skip tidak punya entri, jadi tidak ikut dihitung.
    const flagEntries = Object.entries(room.flagVotes)
    const agreed = flagEntries.filter(([, v]) => v.p1 === v.p2).length
    const disagreed = flagEntries
      .filter(([, v]) => v.p1 !== v.p2)
      .map(([qid]) => questionService.getById(qid))
      .filter((q) => q !== undefined)
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl py-4 sm:py-6"
      >
        <div className="confetti-bg -mx-2 rounded-[28px] px-2 py-6 text-center sm:-mx-4 sm:px-4">
          <h1 className="display-tight font-display text-3xl font-black italic text-terracotta-500 sm:text-5xl">
            {t('session.summaryTitle')}
          </h1>
        </div>

        {/* Dua kartu statistik */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
            <span aria-hidden className="text-3xl">🃏</span>
            <div>
              <p className="font-display text-2xl font-black tabular-nums">{count}</p>
              <p className="text-xs font-semibold text-cocoa-500">{t('session.statQuestions')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
            <span aria-hidden className="text-3xl">⏱️</span>
            <div>
              <p className="font-display text-2xl font-black tabular-nums">{minutes}</p>
              <p className="text-xs font-semibold text-cocoa-500">{t('session.statMinutes')}</p>
            </div>
          </div>
        </div>

        {flagEntries.length > 0 && (
          <div className="mt-6 rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
            <h2 className="flex items-center gap-1.5 font-display text-lg font-bold italic">
              <Glyph name="flagRed" className="h-4 w-4 text-flag-red" />
              <Glyph name="flagGreen" className="h-4 w-4 text-flag-green" />
              {t('flag.recapTitle')}
            </h2>
            <p className="mt-2 text-sm font-bold text-cocoa-700">
              {t('flag.recapAgree', { agree: agreed, total: flagEntries.length })}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream-100">
              <div
                className="h-full rounded-full bg-flag-green"
                style={{ width: `${(agreed / flagEntries.length) * 100}%` }}
              />
            </div>

            {disagreed.length > 0 && (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cocoa-500">
                  {t('flag.recapDisagree')}
                </p>
                <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {disagreed.map((q) => (
                    <div
                      key={q.id}
                      className="w-52 shrink-0 snap-start rounded-2xl bg-cocoa-900 p-4 text-sm leading-snug text-white"
                    >
                      {q.text[lang]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {favorit.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold italic sm:text-xl">
              {t('session.favCardsTitle')}
            </h2>
            <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favorit.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex w-52 shrink-0 snap-start flex-col rounded-3xl border border-cream-200 bg-white p-4 shadow-warm-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-terracotta-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-terracotta-700">
                      {t(`category.${room.setup.category}.label`)}
                    </span>
                    <span aria-hidden className="text-terracotta-500">❤️</span>
                  </div>
                  <p className="mt-3 font-display text-sm leading-snug text-cocoa-900">{q.text[lang]}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/room"
            className="btn-tactile w-full rounded-full bg-terracotta-500 px-8 py-4 text-center font-bold text-white hover:bg-terracotta-600"
          >
            {t('session.saveToHistory')}
          </Link>
          <Link
            href="/room/setup"
            className="press w-full rounded-full border-2 border-terracotta-200 bg-white px-8 py-3.5 text-center font-bold text-terracotta-600 hover:bg-cream-100"
          >
            {t('session.playAgain')}
          </Link>
        </div>
      </motion.div>
    )
  }

  const question = questionService.getById(currentCardId(room) ?? '')
  if (!question) return <SessionSkeleton />

  const isPro = user?.plan === 'pro'
  const showFlagToggle =
    room.setup.category === 'pasangan' &&
    room.setup.participantCount === 2 &&
    room.flagIndex < room.flagReserve.length

  const advance = async () => {
    if (advancing) return
    setAdvancing(true)
    try {
      const wasFlagMode = room.flagMode
      const next = await roomService.advanceCard(room.id)
      setRoom(next)
      // Server mematikan flagMode saat reserve habis — tidak perlu field khusus.
      if (wasFlagMode && !next.flagMode) setToast(t('flag.exhausted'))
    } catch (err) {
      if (err instanceof PaywallError) {
        setResetAt(err.resetAt)
        setPaywallReason(err.reason)
        setPaywall(true)
      } else throw err
    } finally {
      setAdvancing(false)
    }
  }

  const toggleFavorit = async () => {
    setRoom(await roomService.toggleFavorite(room.id, question.id))
  }

  const akhiri = async () => {
    setRoom(await roomService.endSession(room.id))
  }

  const toggleFlagMode = async () => {
    if (!isPro) {
      setPaywallReason('flagMode')
      setPaywall(true)
      return
    }
    try {
      const next = await roomService.setFlagMode(room.id, !room.flagMode)
      setRoom(next)
      setToast(next.flagMode ? t('flag.on') : t('flag.off'))
    } catch (err) {
      if (err instanceof PaywallError) {
        setPaywallReason('flagMode')
        setPaywall(true)
      } else {
        setToast(err instanceof Error ? err.message : t('flag.toggleFailed'))
      }
    }
  }

  const saveVotes = async (p1: FlagVote, p2: FlagVote) => {
    await roomService.saveFlagVotes(room.id, question.id, { p1, p2 })
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-cocoa-500">
        <div className="flex items-center gap-3">
          <span className="font-bold tabular-nums">
            {t('session.cardIndex', { n: playedCount(room) })}
          </span>
          {showFlagToggle && (
            <button
              onClick={toggleFlagMode}
              aria-pressed={room.flagMode}
              className={`press flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold ${
                room.flagMode
                  ? 'border-terracotta-500 bg-terracotta-100 text-terracotta-700'
                  : 'border-cream-200 bg-white text-cocoa-500'
              }`}
            >
              <Glyph name="flagRed" className="h-3.5 w-3.5 text-flag-red" />
              <Glyph name="flagGreen" className="h-3.5 w-3.5 text-flag-green" />
              {t('flag.toggle')}
              {!isPro && (
                <span className="rounded-full bg-butter-100 px-1.5 py-0.5 text-[10px] text-cocoa-700">
                  {t('flag.proBadge')}
                </span>
              )}
            </button>
          )}
        </div>
        <button onClick={akhiri} className="press rounded-md font-medium hover:text-terracotta-600">
          {t('session.endSession')}
        </button>
      </div>

      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="mt-1 flex h-9 w-9 shrink-0 -rotate-3 items-center justify-center rounded-xl bg-terracotta-500 font-display text-sm font-black text-white shadow-warm-sm"
        >
          CT
        </div>
        <div className="w-full">
          <AnimatePresence mode="wait">
            {question.type === 'flag' ? (
              <FlagCard
                key={question.id}
                question={question}
                nomor={playedCount(room)}
                favorit={room.favorites.includes(question.id)}
                onToggleFavorit={toggleFavorit}
                onVoted={saveVotes}
              />
            ) : (
              <QuestionCard
                key={question.id}
                question={question}
                nomor={playedCount(room)}
                favorit={room.favorites.includes(question.id)}
                onToggleFavorit={toggleFavorit}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={advance}
          disabled={advancing}
          className="btn-tactile flex-1 rounded-full bg-terracotta-500 px-6 py-4 font-bold text-white hover:bg-terracotta-600 disabled:opacity-60"
        >
          {t('session.next')} <span aria-hidden>→</span>
        </button>
        <button
          onClick={advance}
          disabled={advancing}
          className="press rounded-full border-2 border-cream-200 bg-white px-8 py-3 font-bold text-cocoa-500 hover:bg-cream-100 disabled:opacity-60"
        >
          {t('session.skip')}
        </button>
      </div>

      {toast && (
        <p role="status" className="rounded-2xl bg-cocoa-900 px-4 py-2.5 text-center text-sm font-semibold text-white">
          {toast}
        </p>
      )}

      <PaywallModal open={paywall} reason={paywallReason} resetAt={resetAt} onClose={() => setPaywall(false)} />
    </div>
  )
}
