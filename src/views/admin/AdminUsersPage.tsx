'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import type { Plan, User } from '../../services/types'

const selectClass =
  'rounded-full border border-cream-200 bg-white px-3 py-1.5 text-xs font-bold text-cocoa-700'

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    adminService.listUsers().then(setUsers)
  }, [])

  const refresh = async () => setUsers(await adminService.listUsers())

  const withBusy = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id)
    try {
      await action()
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = (u: User) => {
    if (!window.confirm(t('admin.users.deleteConfirm', { name: u.name }))) return
    void withBusy(u.id, () => adminService.deleteUser(u.id))
  }

  const joinedFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [i18n.language],
  )

  const visible = useMemo(() => {
    if (!users) return null
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  if (!users || !visible) {
    return (
      <div className="h-64 animate-pulse rounded-3xl border border-cream-200 bg-cream-100/60" aria-hidden="true" />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="sr-only" htmlFor="user-search">
          {t('admin.users.search')}
        </label>
        <input
          id="user-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.users.search')}
          className="w-full max-w-xs rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-cocoa-900 placeholder:text-cocoa-500 focus:border-terracotta-400 focus:outline-none"
        />
        <p className="text-xs font-medium tabular-nums text-cocoa-500">
          {t('admin.users.count', { count: visible.length })}
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-cream-200 bg-white shadow-warm-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-cream-200 text-xs font-bold uppercase text-cocoa-500">
              <th className="px-5 py-3">{t('admin.users.name')}</th>
              <th className="px-5 py-3">{t('admin.users.email')}</th>
              <th className="px-5 py-3">{t('admin.users.joined')}</th>
              <th className="px-5 py-3">{t('admin.users.plan')}</th>
              <th className="px-5 py-3">{t('admin.users.role')}</th>
              <th className="px-5 py-3 text-right">{t('admin.users.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-cocoa-500">
                  {t('admin.users.noResults')}
                </td>
              </tr>
            )}
            {visible.map((u) => {
              const isMe = me?.id === u.id
              const busy = busyId === u.id
              return (
                <tr key={u.id} className="border-b border-cream-200 transition-colors last:border-b-0 hover:bg-cream-50/60">
                  <td className="px-5 py-3 font-bold text-cocoa-900">
                    {u.name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-butter-100 px-2 py-0.5 text-[10px] font-bold uppercase text-cocoa-700">
                        {t('admin.users.you')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-cocoa-500">{u.email}</td>
                  <td className="px-5 py-3 tabular-nums text-cocoa-500">
                    {joinedFmt.format(new Date(u.createdAt))}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.plan}
                      disabled={busy}
                      onChange={(e) =>
                        void withBusy(u.id, () =>
                          adminService.setUserPlan(u.id, e.target.value as Plan),
                        )
                      }
                      className={selectClass}
                      aria-label={t('admin.users.plan')}
                    >
                      <option value="free">{t('nav.planFree')}</option>
                      <option value="pro">{t('nav.planPro')}</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-cocoa-900 text-cream-50'
                          : 'border border-cream-200 text-cocoa-500'
                      }`}
                    >
                      {t(`admin.role.${u.role}`)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={busy || isMe}
                      className="press rounded-full px-3 py-1.5 text-xs font-bold text-terracotta-600 hover:bg-terracotta-500/10 disabled:opacity-40"
                    >
                      {t('admin.users.delete')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
