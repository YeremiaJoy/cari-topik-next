'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'

export default function AdminAnnouncementPage() {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(false)
  const [messageId, setMessageId] = useState('')
  const [messageEn, setMessageEn] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminService.getAnnouncement().then((a) => {
      if (a) {
        setMessageId(a.message.id)
        setMessageEn(a.message.en)
        setEnabled(a.enabled)
      }
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    setBusy(true)
    setSaved(false)
    try {
      const empty = !messageId.trim() && !messageEn.trim()
      await adminService.setAnnouncement(
        empty
          ? null
          : { message: { id: messageId.trim(), en: messageEn.trim() }, enabled },
      )
      if (empty) setEnabled(false)
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <p className="text-sm text-cocoa-500">{t('common.loading')}</p>

  const fieldClass =
    'w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 focus:border-terracotta-400 focus:outline-none'

  return (
    <div className="max-w-xl rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm">
      <p className="text-sm text-cocoa-500">{t('admin.announce.hint')}</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase text-cocoa-500" htmlFor="ann-id">
            {t('admin.announce.messageId')}
          </label>
          <textarea
            id="ann-id"
            value={messageId}
            onChange={(e) => {
              setSaved(false)
              setMessageId(e.target.value)
            }}
            rows={2}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase text-cocoa-500" htmlFor="ann-en">
            {t('admin.announce.messageEn')}
          </label>
          <textarea
            id="ann-en"
            value={messageEn}
            onChange={(e) => {
              setSaved(false)
              setMessageEn(e.target.value)
            }}
            rows={2}
            className={fieldClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-cocoa-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setSaved(false)
              setEnabled(e.target.checked)
            }}
            className="h-4 w-4 accent-terracotta-500"
          />
          {t('admin.announce.enabled')}
        </label>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={busy}
          className="press rounded-full bg-cocoa-900 px-5 py-2 text-sm font-bold text-cream-50 disabled:opacity-50"
        >
          {busy ? t('pricing.processing') : t('admin.save')}
        </button>
        {saved && <span className="text-sm font-bold text-cocoa-500">{t('admin.saved')}</span>}
      </div>
    </div>
  )
}
