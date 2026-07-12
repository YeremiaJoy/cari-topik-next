'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { useLang } from '../i18n/useLang'
import { adminService, appConfig } from '../services'
import type { Announcement, AppConfig } from '../services/types'
import NavLink from './NavLink'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <rect x="7" y="7" width="24" height="34" rx="6" fill="var(--color-butter-200)" transform="rotate(-10 19 24)" />
      <rect x="17" y="7" width="24" height="34" rx="6" fill="var(--color-terracotta-500)" transform="rotate(7 29 24)" />
      <path
        transform="translate(22.5 18.5) rotate(7)"
        fill="var(--color-cream-50)"
        d="M0 4 C0 1.8 1.8 0 4 0 C5.5 0 6.7 0.8 7.5 2 C8.3 0.8 9.5 0 11 0 C13.2 0 15 1.8 15 4 C15 8 7.5 13 7.5 13 C7.5 13 0 8 0 4 Z"
      />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden
      className="h-5 w-5"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 8h16" />
          <path d="M4 16h16" />
        </>
      )}
    </svg>
  )
}

function LangSwitch({
  lang,
  setLang,
}: {
  lang: 'id' | 'en'
  setLang: (l: 'id' | 'en') => void
}) {
  return (
    <div className="flex overflow-hidden rounded-full border border-cream-200 bg-white/60 text-xs font-bold">
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={
            lang === l
              ? 'bg-cocoa-900 px-3 py-1.5 text-cream-50 transition-colors'
              : 'px-3 py-1.5 text-cocoa-500 transition-colors hover:bg-cream-100 hover:text-cocoa-900'
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md pb-0.5 transition-colors ${
    isActive
      ? 'border-b-2 border-terracotta-500 font-bold text-terracotta-600'
      : 'text-cocoa-700 hover:text-terracotta-600'
  }`

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between px-4 py-3.5 text-sm transition-colors ${
    isActive ? 'font-bold text-terracotta-600' : 'font-medium text-cocoa-700'
  }`

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { lang, setLang } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [maintenance, setMaintenance] = useState<AppConfig['maintenance'] | null>(null)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const isAdmin = user?.role === 'admin'

  // Konfigurasi publik dari admin; dibaca ulang tiap pindah halaman.
  useEffect(() => {
    adminService.getAnnouncement().then(setAnnouncement)
    appConfig.refresh().then((config) => setMaintenance(config.maintenance ?? null))
  }, [pathname])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('meta.title')
  }, [lang, t])

  // Tutup menu tiap pindah halaman
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 border-b border-cream-200/70 bg-cream-50/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="press flex items-center gap-2 rounded-md font-display text-xl font-bold text-cocoa-900 sm:text-2xl"
          >
            <LogoMark className="h-7 w-7 sm:h-8 sm:w-8" />
            <span>
              Cari<span className="text-terracotta-500">Topik</span>
            </span>
          </Link>

          {/* Desktop: semua inline */}
          <div className="hidden items-center gap-5 text-sm font-medium sm:flex">
            <LangSwitch lang={lang} setLang={setLang} />
            <NavLink href="/pricing" className={desktopLink}>
              {t('nav.pricing')}
            </NavLink>
            {user && (
              <NavLink href="/room" className={desktopLink}>
                {t('nav.dashboard')}
              </NavLink>
            )}
            {isAdmin && (
              <NavLink href="/admin" className={desktopLink}>
                {t('nav.admin')}
              </NavLink>
            )}
            {user ? (
              <NavLink
                href="/profile"
                aria-label={t('nav.profile')}
                className={({ isActive }) =>
                  `press flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-black shadow-warm-sm transition-colors ${
                    isActive
                      ? 'bg-cocoa-900 text-cream-50'
                      : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                  }`
                }
              >
                {user.name.charAt(0).toUpperCase()}
              </NavLink>
            ) : (
              <Link
                href="/login"
                className="press rounded-full bg-terracotta-500 px-4 py-2 font-bold text-white shadow-warm-sm hover:bg-terracotta-600 hover:shadow-warm-md"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile: hanya aksi utama + tombol menu */}
          <div className="flex items-center gap-2 sm:hidden">
            {user ? (
              <NavLink
                href="/profile"
                aria-label={t('nav.profile')}
                className={({ isActive }) =>
                  `press flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-black shadow-warm-sm transition-colors ${
                    isActive
                      ? 'bg-cocoa-900 text-cream-50'
                      : 'bg-terracotta-500 text-white hover:bg-terracotta-600'
                  }`
                }
              >
                {user.name.charAt(0).toUpperCase()}
              </NavLink>
            ) : (
              <Link
                href="/login"
                className="press rounded-full bg-terracotta-500 px-3.5 py-1.5 text-sm font-bold text-white shadow-warm-sm hover:bg-terracotta-600"
              >
                {t('nav.login')}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="press flex h-9 w-9 items-center justify-center rounded-xl border border-cream-200 bg-white/60 text-cocoa-700"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </nav>

        {/* Panel menu mobile: datar, dipisah garis 1px */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="border-t border-cream-200/70 sm:hidden"
            >
              <NavLink href="/pricing" className={mobileLink}>
                {t('nav.pricing')}
              </NavLink>
              {user && (
                <NavLink
                  href="/room"
                  className={({ isActive }) =>
                    `${mobileLink({ isActive })} border-t border-cream-200/70`
                  }
                >
                  {t('nav.dashboard')}
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  href="/admin"
                  className={({ isActive }) =>
                    `${mobileLink({ isActive })} border-t border-cream-200/70`
                  }
                >
                  {t('nav.admin')}
                </NavLink>
              )}
              <div className="flex items-center justify-between border-t border-cream-200/70 px-4 py-3">
                <span className="text-sm font-medium text-cocoa-500">{t('nav.language')}</span>
                <LangSwitch lang={lang} setLang={setLang} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {maintenance?.enabled && (
        <div className="border-b border-terracotta-200 bg-terracotta-50">
          <p className="mx-auto max-w-4xl px-4 py-2.5 text-center text-sm font-bold text-cocoa-800 sm:px-6">
            {maintenance.message[lang] || maintenance.message.id || maintenance.message.en}
          </p>
        </div>
      )}

      {announcement?.enabled && (
        <div className="border-b border-butter-200 bg-butter-100">
          <p className="mx-auto max-w-4xl px-4 py-2.5 text-center text-sm font-medium text-cocoa-700 sm:px-6">
            {announcement.message[lang]}
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

      <footer className="mt-12 border-t border-cream-200/70">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 text-sm text-cocoa-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <span className="font-display font-bold text-cocoa-700">CariTopik</span>
            <span aria-hidden>·</span>
            <span>{t('footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/" className="rounded-md hover:text-terracotta-600">
              {t('footer.home')}
            </Link>
            <Link href="/pricing" className="rounded-md hover:text-terracotta-600">
              {t('nav.pricing')}
            </Link>
            <span className="text-xs text-cocoa-500/70">{t('footer.demo')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
