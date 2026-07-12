'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { appConfig, roomService } from '../services'
import { QUESTION_RESET_MS, ROOM_DELETE_COOLDOWN_MS } from '../services/types'
import type { Category, Room } from '../services/types'
import { useLang, localeTag } from '../i18n/useLang'
import { formatCountdown } from '../lib/countdown'
import PaywallModal from '../components/PaywallModal'

const CATEGORY_EMOJI: Record<Category, string> = {
  pasangan: '💘',
  teman: '🎈',
  keluarga: '🏡',
}

function formatTanggal(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

function RoomSkeleton() {
  return (
    <ul className="mt-4 flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-2xl border border-cream-200 bg-white/60 px-6 py-4">
          <div className="h-4 w-40 rounded-full bg-cream-200" />
          <div className="mt-2 h-3 w-56 rounded-full bg-cream-100" />
        </li>
      ))}
    </ul>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [nowMs, setNowMs] = useState(0)
  const [paywall, setPaywall] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)
  const [deleting, setDeleting] = useState(false)
  const reduce = useReducedMotion()
  const { t } = useTranslation()
  const { lang } = useLang()

  useEffect(() => {
    roomService.listRooms().then((r) => {
      setRooms(r)
      setNowMs(Date.now())
    })
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  /** Countdown "hh:mm:ss" sampai kuota kartu room terbuka lagi; null jika tidak terkunci. */
  const quotaResetCountdown = (room: Room): string | null => {
    if (!nowMs || user?.plan !== 'free' || room.status !== 'active' || !room.exhaustedAt) return null
    const resetMs = Date.parse(room.exhaustedAt) + QUESTION_RESET_MS
    if (nowMs >= resetMs) return null
    return formatCountdown(resetMs - nowMs)
  }

  /** Countdown "hh:mm:ss" sampai room selesai boleh dihapus (khusus free); null jika bukan kasusnya. */
  const deleteCountdown = (room: Room): string | null => {
    if (!nowMs || user?.plan !== 'free' || room.status !== 'completed' || !room.endedAt) return null
    const deletableMs = Date.parse(room.endedAt) + ROOM_DELETE_COOLDOWN_MS
    if (nowMs >= deletableMs) return null
    return formatCountdown(deletableMs - nowMs)
  }

  const canDelete = (room: Room): boolean => {
    if (room.status !== 'completed') return false
    if (user?.plan !== 'free') return true
    return nowMs > 0 && deleteCountdown(room) === null
  }

  const askDelete = (e: React.MouseEvent, room: Room) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTarget(room)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await roomService.deleteRoom(deleteTarget.id)
      setRooms(await roomService.listRooms())
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const roomLimitReached =
    user?.plan === 'free' && (rooms?.length ?? 0) >= appConfig.get().freeMaxRooms

  const handleNewRoom = (e: React.MouseEvent) => {
    if (roomLimitReached) {
      e.preventDefault()
      setPaywall(true)
    }
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <section>
        <h1 className="display-tight font-display text-3xl font-black sm:text-5xl">
          {t('dashboard.greeting', { name: user?.name })}
        </h1>
        <p className="mt-3 text-base text-cocoa-500 sm:text-lg">{t('dashboard.subtitle')}</p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          whileHover={reduce ? undefined : { y: -4 }}
          className="mt-7"
        >
          <Link
            href="/room/setup"
            onClick={handleNewRoom}
            className="press relative block overflow-hidden rounded-3xl bg-terracotta-500 p-6 text-white shadow-warm-lg hover:bg-terracotta-600 sm:p-8"
          >
            {/* Kartu dekoratif di sudut */}
            <div aria-hidden className="pointer-events-none absolute -right-4 -top-6 opacity-25 sm:opacity-40">
              <div className="float-slow h-28 w-20 rounded-2xl border-4 border-white/70 bg-white/10 [--float-rotate:12deg]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute right-14 -top-2 opacity-15 sm:opacity-25">
              <div className="h-24 w-16 -rotate-6 rounded-2xl border-4 border-white/70 bg-white/10" />
            </div>
            <span className="font-display text-xl font-bold sm:text-3xl">{t('dashboard.newRoom')}</span>
            <p className="mt-1.5 max-w-md text-terracotta-100">{t('dashboard.newRoomBody')}</p>
          </Link>
        </motion.div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold sm:text-3xl">{t('dashboard.previousRooms')}</h2>

        {rooms === null ? (
          <RoomSkeleton />
        ) : rooms.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-cream-200 bg-white/40 px-6 py-12 text-center">
            <div aria-hidden className="flex">
              <span className="-rotate-12 text-4xl">🃏</span>
              <span className="text-4xl">💬</span>
              <span className="rotate-12 text-4xl">🃏</span>
            </div>
            <p className="font-display text-lg font-bold text-cocoa-900 sm:text-xl">{t('dashboard.emptyTitle')}</p>
            <p className="max-w-xs text-sm text-cocoa-500">{t('dashboard.empty')}</p>
            <Link
              href="/room/setup"
              className="press mt-2 rounded-full bg-terracotta-500 px-6 py-2.5 font-bold text-white shadow-warm-sm hover:bg-terracotta-600"
            >
              {t('dashboard.emptyCta')}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {rooms.map((room, i) => (
              <motion.li
                key={room.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/room/${room.id}`}
                  className="press flex items-center gap-4 rounded-2xl border border-cream-200 bg-white px-5 py-4 shadow-warm-sm transition-transform hover:-translate-y-0.5 hover:border-terracotta-400 hover:shadow-warm-md"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-xl"
                  >
                    {CATEGORY_EMOJI[room.setup.category]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold">
                      {t(`category.${room.setup.category}.label`)} ·{' '}
                      {t(room.setup.participantCount === 2 ? 'common.modePair' : 'common.modeGroup')}
                    </span>
                    <p className="truncate text-sm text-cocoa-500">
                      {t('dashboard.cardsDiscussed', {
                        count: room.currentIndex + 1,
                        date: formatTanggal(room.createdAt, localeTag(lang)),
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {quotaResetCountdown(room) !== null ? (
                        <span className="rounded-full bg-butter-100 px-3 py-1 text-xs font-bold tabular-nums text-cocoa-700">
                          {t('dashboard.resetIn', { time: quotaResetCountdown(room) })}
                        </span>
                      ) : (
                        <span
                          className={
                            room.status === 'active'
                              ? 'rounded-full bg-terracotta-100 px-3 py-1 text-xs font-bold text-terracotta-700'
                              : 'rounded-full bg-cream-200 px-3 py-1 text-xs font-bold text-cocoa-700'
                          }
                        >
                          {room.status === 'active' ? t('dashboard.continue') : t('dashboard.finished')}
                        </span>
                      )}
                      {canDelete(room) && (
                        <button
                          onClick={(e) => askDelete(e, room)}
                          aria-label={t('dashboard.deleteRoom')}
                          title={t('dashboard.deleteRoom')}
                          className="press flex h-7 w-7 items-center justify-center rounded-full border border-cream-200 text-cocoa-400 hover:border-terracotta-400 hover:text-terracotta-600"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7m4 4v6m4-6v6"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {deleteCountdown(room) !== null && (
                      <span className="text-[11px] tabular-nums text-cocoa-400">
                        {t('dashboard.deleteIn', { time: deleteCountdown(room) })}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <PaywallModal open={paywall} reason="rooms" onClose={() => setPaywall(false)} />

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/40 p-6"
            onClick={() => setDeleteTarget(null)}
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
              aria-labelledby="confirm-delete-title"
            >
              <span aria-hidden className="text-3xl">🗑️</span>
              <h2 id="confirm-delete-title" className="mt-2 font-display text-xl font-bold sm:text-2xl">
                {t('dashboard.deleteTitle')}
              </h2>
              <p className="mt-3 text-sm text-cocoa-500">{t('dashboard.deleteConfirm')}</p>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="press mt-6 w-full rounded-full bg-terracotta-500 px-6 py-3 font-bold text-white shadow-warm-md hover:bg-terracotta-600 disabled:opacity-60"
              >
                {t('dashboard.deleteYes')}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="press mt-3 w-full rounded-md text-sm text-cocoa-500 hover:text-cocoa-700"
              >
                {t('dashboard.deleteNo')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
