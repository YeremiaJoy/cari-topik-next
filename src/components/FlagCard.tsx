'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { FlagVote, Question } from '../services/types'
import { useLang } from '../i18n/useLang'
import Glyph from './Glyph'

interface Props {
  question: Question
  nomor: number
  favorit: boolean
  onToggleFavorit: () => void
  /** Dipanggil sekali saat tap kedua masuk — induk yang menyimpan ke server. */
  onVoted: (p1: FlagVote, p2: FlagVote) => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        d="M12 21c-.4 0-.8-.14-1.1-.4C7 17.4 2.5 13.6 2.5 9.3 2.5 6.4 4.8 4 7.7 4c1.7 0 3.3.8 4.3 2.1C13 4.8 14.6 4 16.3 4c2.9 0 5.2 2.4 5.2 5.3 0 4.3-4.5 8.1-8.4 11.3-.3.26-.7.4-1.1.4Z"
        fill={filled ? 'var(--color-terracotta-400)' : 'none'}
        stroke={filled ? 'var(--color-terracotta-400)' : 'var(--color-cream-200)'}
        strokeWidth="1.8"
      />
    </svg>
  )
}

function VotePanel({
  partnerKey,
  vote,
  flipped,
  onPick,
}: {
  partnerKey: 'partner1' | 'partner2'
  vote: FlagVote | null
  flipped: boolean
  onPick: (v: FlagVote) => void
}) {
  const { t } = useTranslation()
  const partner = t(`flag.${partnerKey}`)
  return (
    <div className={`rounded-2xl border border-cream-200 bg-white p-3 ${flipped ? 'rotate-180' : ''}`}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cocoa-500">
        {partner}
        {vote && <span className="ml-1.5 text-terracotta-600">· {t('flag.locked')}</span>}
      </p>
      {vote ? (
        // Pilihan disembunyikan sampai reveal supaya tidak bisa diintip.
        <div className="rounded-full border-2 border-dashed border-cream-200 bg-cream-100 py-2 text-center text-xs font-bold text-cocoa-500">
          {t('flag.locked')}
        </div>
      ) : (
        <div className="flex gap-2">
          {(['red', 'green'] as const).map((choice) => (
            <button
              key={choice}
              onClick={() => onPick(choice)}
              aria-label={t('flag.voteAria', { choice: t(`flag.${choice}`), partner })}
              // Bidang solid, bukan tint tipis — warnanya harus kebaca dari
              // seberang meja, bukan cuma pas HP di depan muka.
              className={`press flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-extrabold tracking-wide text-white shadow-warm-sm ${
                choice === 'red' ? 'bg-flag-red' : 'bg-flag-green-deep'
              }`}
            >
              <Glyph name={choice === 'red' ? 'flagRed' : 'flagGreen'} className="h-[26px] w-[26px]" />
              {t(`flag.${choice}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultTile({ partnerKey, vote }: { partnerKey: 'partner1' | 'partner2'; vote: FlagVote }) {
  const { t } = useTranslation()
  const red = vote === 'red'
  return (
    <div
      className={`flex-1 rounded-2xl p-3 text-center text-white shadow-warm-sm ${
        red ? 'bg-flag-red' : 'bg-flag-green-deep'
      }`}
    >
      <Glyph name={red ? 'flagRed' : 'flagGreen'} className="mx-auto h-[34px] w-[34px]" />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider">{t(`flag.${partnerKey}`)}</p>
      <p className="text-xs font-extrabold tracking-wide">{t(`flag.${vote}`)}</p>
    </div>
  )
}

export default function FlagCard({ question, nomor, favorit, onToggleFavorit, onVoted }: Props) {
  const reduce = useReducedMotion()
  const { lang } = useLang()
  const { t } = useTranslation()
  const [p1, setP1] = useState<FlagVote | null>(null)
  const [p2, setP2] = useState<FlagVote | null>(null)

  const revealed = p1 !== null && p2 !== null

  const pick = (who: 'p1' | 'p2', value: FlagVote) => {
    const next1 = who === 'p1' ? value : p1
    const next2 = who === 'p2' ? value : p2
    setP1(next1)
    setP2(next2)
    if (next1 && next2) onVoted(next1, next2)
  }

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{ transformPerspective: 1000 }}
      className="rounded-[32px] border border-cream-200 bg-cream-100 p-3 shadow-warm-md"
    >
      {revealed ? (
        <div className="flex gap-2">
          <ResultTile partnerKey="partner1" vote={p1} />
          <ResultTile partnerKey="partner2" vote={p2} />
        </div>
      ) : (
        <VotePanel partnerKey="partner1" vote={p1} flipped onPick={(v) => pick('p1', v)} />
      )}

      {/* Pita gelap: teks skenario, penanda mode, dan tombol favorit. */}
      <div className="my-2.5 rounded-2xl bg-cocoa-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cream-200">
            <Glyph name="flagRed" className="h-3.5 w-3.5 text-flag-red-on-dark" />
            <span aria-hidden>·</span>
            <Glyph name="flagGreen" className="h-3.5 w-3.5 text-flag-green-on-dark" />
            <span className="ml-1 text-terracotta-400">{t('flag.scenarioN', { n: nomor })}</span>
          </span>
          <button
            onClick={onToggleFavorit}
            aria-label={favorit ? t('card.favRemove') : t('card.favAdd')}
            aria-pressed={favorit}
            className="press -mt-1 rounded-full p-0.5"
          >
            <HeartIcon filled={favorit} />
          </button>
        </div>
        <p className="display-tight mt-2.5 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
          {question.text[lang]}
        </p>
      </div>

      {revealed ? (
        // Sepakat → hijau, beda → merah. Vonisnya ikut berwarna, bukan cuma teks.
        <p
          className={`rounded-2xl py-2 text-center font-display text-lg font-black italic ${
            p1 === p2
              ? 'bg-flag-green-soft text-flag-green-deep'
              : 'bg-flag-red-soft text-flag-red'
          }`}
        >
          {p1 === p2 ? t('flag.same') : t('flag.different')}
        </p>
      ) : (
        <VotePanel partnerKey="partner2" vote={p2} flipped={false} onPick={(v) => pick('p2', v)} />
      )}
    </motion.article>
  )
}
