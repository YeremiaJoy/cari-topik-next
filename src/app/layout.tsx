import type { Metadata, Viewport } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'
import AppShell from '../components/AppShell'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'CariTopik — Kartu Pertanyaan untuk Obrolan Mendalam',
  description:
    'CariTopik — permainan kartu pertanyaan digital untuk obrolan yang lebih dalam bersama pasangan, teman, dan keluarga.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'CariTopik — Kartu Pertanyaan untuk Obrolan Mendalam',
    description:
      'Satu kartu, satu cerita, satu langkah lebih dekat. Permainan kartu pertanyaan untuk orang-orang terdekatmu.',
    type: 'website',
    images: [{ url: '/images/og-cover.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/og-cover.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#fdf8ec',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
