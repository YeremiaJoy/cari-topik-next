import type { SVGProps } from 'react'

export type GlyphName =
  | 'couple'
  | 'friends'
  | 'family'
  | 'pair'
  | 'group'
  | 'introvert'
  | 'extrovert'
  | 'flagRed'
  | 'flagGreen'

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

/** Ikon garis hangat untuk kategori, mode, dan kepribadian — pengganti emoji. */
export default function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const cn = className ?? 'h-6 w-6'
  switch (name) {
    case 'couple':
      return (
        <svg {...base} className={cn}>
          <path d="M12 20.5c-3.4-2.6-7-5.2-7-8.8A3.7 3.7 0 0 1 12 9.4 3.7 3.7 0 0 1 19 11.7c0 3.6-3.6 6.2-7 8.8Z" fill="currentColor" fillOpacity="0.14" />
        </svg>
      )
    case 'friends':
      return (
        <svg {...base} className={cn}>
          <ellipse cx="9" cy="7" rx="4" ry="4.6" fill="currentColor" fillOpacity="0.14" />
          <ellipse cx="16.5" cy="9" rx="3" ry="3.5" fill="currentColor" fillOpacity="0.14" />
          <path d="M9 11.6V15M16.5 12.5V15" />
        </svg>
      )
    case 'family':
      return (
        <svg {...base} className={cn}>
          <path d="M4 11 12 5l8 6" />
          <path d="M6 10.5V19h12v-8.5" fill="currentColor" fillOpacity="0.12" />
          <path d="M10.5 19v-4h3v4" />
        </svg>
      )
    case 'pair':
      return (
        <svg {...base} className={cn}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H9l-5 4v-4Z" fill="currentColor" fillOpacity="0.12" />
          <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" />
        </svg>
      )
    case 'group':
      return (
        <svg {...base} className={cn}>
          <circle cx="8" cy="8.5" r="2.4" fill="currentColor" fillOpacity="0.14" />
          <circle cx="16" cy="8.5" r="2.4" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="7" r="2.6" fill="currentColor" fillOpacity="0.18" />
          <path d="M4 18c0-2.2 2-3.6 4-3.6M20 18c0-2.2-2-3.6-4-3.6M8.4 18c0-2.5 1.7-4 3.6-4s3.6 1.5 3.6 4" />
        </svg>
      )
    case 'introvert':
      return (
        <svg {...base} className={cn}>
          <path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5Z" fill="currentColor" fillOpacity="0.14" />
        </svg>
      )
    case 'extrovert':
      return (
        <svg {...base} className={cn}>
          <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" fill="currentColor" fillOpacity="0.16" />
        </svg>
      )
    case 'flagRed':
      return (
        <svg {...base} className={cn}>
          <path d="M6.6 3.2v17.6" strokeWidth="2.2" />
          <path d="M7.4 4.4h10.4l-3 3.7 3 3.7H7.4z" fill="currentColor" stroke="none" />
          <path d="M10.6 5.9c1.5.9 2.6.9 4.1 0" stroke="var(--color-cream-50)" strokeWidth="1.4" opacity="0.55" />
        </svg>
      )
    case 'flagGreen':
      return (
        <svg {...base} className={cn}>
          <path d="M6.6 3.2v17.6" strokeWidth="2.2" />
          <path d="M7.4 4.4h7.9c2.5 0 3.8 1.4 3.8 3.7s-1.3 3.7-3.8 3.7H7.4z" fill="currentColor" stroke="none" />
          <path d="M10.6 6c1.5.9 2.6.9 4.1 0" stroke="var(--color-cream-50)" strokeWidth="1.4" opacity="0.55" />
        </svg>
      )
  }
}
