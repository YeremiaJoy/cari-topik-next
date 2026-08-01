'use client'

import { useState } from 'react'

interface Props {
  /** Nama file di /public/illustrations/{name}.{ext} (tanpa ekstensi). */
  name: string
  alt: string
  /** Emoji cadangan saat aset vektor belum tersedia. */
  emoji?: string
  className?: string
  /** Object-fit gambar; default 'contain' agar ilustrasi utuh. */
  fit?: 'contain' | 'cover'
  /** Ekstensi berkas — 'svg' untuk vektor, 'jpg'/'png' untuk raster. */
  ext?: 'svg' | 'png' | 'jpg' | 'webp'
}

/**
 * Slot ilustrasi vektor. Menampilkan placeholder bergaya sampai file
 * `/illustrations/{name}.svg` tersedia — begitu file di-drop, otomatis tampil
 * tanpa perubahan kode.
 */
export default function Illustration({ name, alt, emoji = '🎨', className, fit = 'contain', ext = 'svg' }: Props) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-3xl bg-cream-100 ${className ?? ''}`}
    >
      {failed && (
        <div className="pointer-events-none flex flex-col items-center gap-1 p-4 text-center">
          <span aria-hidden className="text-4xl opacity-80">
            {emoji}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cocoa-500/70">
            {name}
          </span>
        </div>
      )}
      <img
        src={`/illustrations/${name}.${ext}`}
        alt={alt}
        onError={() => setFailed(true)}
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${
          failed ? 'hidden' : ''
        }`}
      />
    </div>
  )
}
