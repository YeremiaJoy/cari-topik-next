'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { Question } from '../services/types'
import { useLang } from '../i18n/useLang'

interface Props {
  question: Question
  nomor: number
  favorit: boolean
  onToggleFavorit: () => void
}

const DEPTH_CHIP: Record<Question['depth'], string> = {
  ringan: 'bg-butter-100 text-cocoa-700',
  sedang: 'bg-terracotta-100 text-terracotta-700',
  dalam: 'bg-terracotta-500 text-white',
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <path
        d="M12 21c-.4 0-.8-.14-1.1-.4C7 17.4 2.5 13.6 2.5 9.3 2.5 6.4 4.8 4 7.7 4c1.7 0 3.3.8 4.3 2.1C13 4.8 14.6 4 16.3 4c2.9 0 5.2 2.4 5.2 5.3 0 4.3-4.5 8.1-8.4 11.3-.3.26-.7.4-1.1.4Z"
        fill={filled ? 'var(--color-terracotta-500)' : 'none'}
        stroke={filled ? 'var(--color-terracotta-500)' : 'var(--color-cocoa-500)'}
        strokeWidth="1.8"
        className="transition-colors duration-200"
      />
    </svg>
  )
}

export default function QuestionCard({ question, nomor, favorit, onToggleFavorit }: Props) {
  const reduce = useReducedMotion()
  const { lang } = useLang()
  const { t } = useTranslation()
  return (
    <div className="relative">
      {/* Tumpukan dek di belakang kartu aktif */}
      <div
        aria-hidden
        className="absolute inset-0 translate-y-2.5 rotate-3 rounded-3xl border border-cream-200 bg-butter-100/70"
      />
      <div
        aria-hidden
        className="absolute inset-0 translate-y-1 -rotate-2 rounded-3xl border border-cream-200 bg-cream-100"
      />
      <motion.article
        initial={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        style={{ transformPerspective: 1000 }}
        className="relative rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-md sm:p-8"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cocoa-500">
            {t('common.cardN', { n: nomor })}
            <span className={`rounded-lg px-2 py-0.5 ${DEPTH_CHIP[question.depth]}`}>
              {t(`depth.${question.depth}`)}
            </span>
          </span>
          <motion.button
            onClick={onToggleFavorit}
            whileTap={reduce ? undefined : { scale: 1.35 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            aria-label={favorit ? t('card.favRemove') : t('card.favAdd')}
            aria-pressed={favorit}
            className="rounded-full p-1 transition-transform hover:scale-110 motion-reduce:transform-none"
          >
            <HeartIcon filled={favorit} />
          </motion.button>
        </div>
        <p className="display-tight mt-5 min-h-24 font-display text-xl font-semibold leading-snug text-cocoa-900 sm:text-3xl">
          {question.text[lang]}
        </p>
      </motion.article>
    </div>
  )
}
