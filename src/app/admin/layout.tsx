'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import RequireAuth from '../../components/RequireAuth'
import RequireAdmin from '../../components/RequireAdmin'
import NavLink from '../../components/NavLink'

const TABS = [
  { href: '/admin', end: true, key: 'admin.tab.overview' },
  { href: '/admin/users', end: false, key: 'admin.tab.users' },
  { href: '/admin/questions', end: false, key: 'admin.tab.questions' },
  { href: '/admin/config', end: false, key: 'admin.tab.config' },
  { href: '/admin/announcement', end: false, key: 'admin.tab.announcement' },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <RequireAuth>
      <RequireAdmin>
        <div>
          <h1 className="display-tight font-display text-2xl font-black sm:text-3xl">
            {t('admin.title')}
          </h1>
          <p className="mt-2 text-sm text-cocoa-500">{t('admin.subtitle')}</p>
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.href}
                href={tab.href}
                end={tab.end}
                className={({ isActive }) =>
                  `press whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-cocoa-900 text-cream-50'
                      : 'border border-cream-200 bg-white/60 text-cocoa-700 hover:bg-cream-100'
                  }`
                }
              >
                {t(tab.key)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6">{children}</div>
        </div>
      </RequireAdmin>
    </RequireAuth>
  )
}
