'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { questionService, roomService } from '../services'
import { PaywallError } from '../services/types'
import type { Room } from '../services/types'
import QuestionCard from '../components/QuestionCard'
import PaywallModal from '../components/PaywallModal'
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
  const [room, setRoom] = useState<Room | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [resetAt, setResetAt] = useState<string | undefined>()
  const [advancing, setAdvancing] = useState(false)

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
      !questionService.getById(room.deck[room.currentIndex])
    ) {
      router.replace('/room')
    }
  }, [room, router])

  if (!room) return <SessionSkeleton />

  if (room.status === 'completed') {
    const favorit = room.favorites
      .map((qid) => questionService.getById(qid))
      .filter((q) => q !== undefined)
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl py-6 text-center sm:py-8"
      >
        <motion.span
          aria-hidden
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.15 }}
          className="inline-block text-5xl"
        >
          🌙
        </motion.span>
        <h1 className="display-tight mt-3 font-display text-3xl font-black sm:text-5xl">
          {t('session.doneTitle')}
        </h1>
        <p className="mt-3 text-base text-cocoa-500 sm:text-lg">
          {t('session.doneBody', { count: room.currentIndex + 1 })}
        </p>
        {favorit.length > 0 && (
          <div className="mt-8 rounded-3xl border border-cream-200 bg-white p-6 text-left shadow-warm-md">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl">
              <span aria-hidden>❤️</span> {t('session.favTitle')}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {favorit.map((q, i) => (
                <motion.li
                  key={q.id}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className={`rounded-2xl bg-cream-100 p-4 font-display text-cocoa-700 ${
                    i % 2 === 0 ? '-rotate-[0.5deg]' : 'rotate-[0.5deg]'
                  }`}
                >
                  {q.text[lang]}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
        <Link
          href="/room"
          className="press mt-10 inline-block rounded-full bg-terracotta-500 px-8 py-3.5 font-bold text-white shadow-warm-md hover:bg-terracotta-600"
        >
          {t('session.backToDashboard')}
        </Link>
      </motion.div>
    )
  }

  const question = questionService.getById(room.deck[room.currentIndex])
  if (!question) return <SessionSkeleton />

  const advance = async () => {
    if (advancing) return
    setAdvancing(true)
    try {
      setRoom(await roomService.advanceCard(room.id))
    } catch (err) {
      if (err instanceof PaywallError) {
        setResetAt(err.resetAt)
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

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-cocoa-500">
        <span className="font-bold tabular-nums">{t('session.cardIndex', { n: room.currentIndex + 1 })}</span>
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
            <QuestionCard
              key={question.id}
              question={question}
              nomor={room.currentIndex + 1}
              favorit={room.favorites.includes(question.id)}
              onToggleFavorit={toggleFavorit}
            />
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <motion.button
          onClick={advance}
          disabled={advancing}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="press flex-1 rounded-full bg-terracotta-500 px-6 py-3.5 font-bold text-white shadow-warm-md hover:bg-terracotta-600 disabled:opacity-60"
        >
          {t('session.next')} <span aria-hidden>→</span>
        </motion.button>
        <button
          onClick={advance}
          disabled={advancing}
          className="press rounded-full border-2 border-cream-200 px-6 py-3 font-bold text-cocoa-500 hover:bg-cream-100 disabled:opacity-60"
        >
          {t('session.skip')}
        </button>
      </div>

      <PaywallModal open={paywall} reason="questions" resetAt={resetAt} onClose={() => setPaywall(false)} />
    </div>
  )
}
