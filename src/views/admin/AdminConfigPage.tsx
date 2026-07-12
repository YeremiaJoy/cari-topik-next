'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'
import { formatRupiah } from '../../services/types'
import type { AppConfig } from '../../services/types'

const FIELDS: Array<{ key: keyof AppConfig; label: string; money?: boolean }> = [
  { key: 'freeMaxParticipants', label: 'admin.config.freeMaxParticipants' },
  { key: 'freeMaxQuestions', label: 'admin.config.freeMaxQuestions' },
  { key: 'freeMaxRooms', label: 'admin.config.freeMaxRooms' },
  { key: 'proPrice', label: 'admin.config.proPrice', money: true },
  { key: 'proPriceAfterDiscount', label: 'admin.config.proPriceAfterDiscount', money: true },
]

export default function AdminConfigPage() {
  const { t } = useTranslation()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminService.getConfig().then(setConfig)
  }, [])

  const handleSave = async () => {
    if (!config) return
    setBusy(true)
    setSaved(false)
    try {
      setConfig(await adminService.updateConfig(config))
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  if (!config) return <p className="text-sm text-cocoa-500">{t('common.loading')}</p>

  const valid = FIELDS.every(({ key }) => Number.isFinite(config[key]) && config[key] > 0)

  return (
    <div className="max-w-md rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm">
      <div className="space-y-4">
        {FIELDS.map(({ key, label, money }) => (
          <div key={key}>
            <label className="mb-1.5 block text-xs font-bold uppercase text-cocoa-500" htmlFor={key}>
              {t(label)}
            </label>
            <input
              id={key}
              type="number"
              min={1}
              value={config[key]}
              onChange={(e) => {
                setSaved(false)
                setConfig({ ...config, [key]: Number(e.target.value) })
              }}
              className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 focus:border-terracotta-400 focus:outline-none"
            />
            {money && Number.isFinite(config[key]) && (
              <p className="mt-1 text-xs text-cocoa-500">{formatRupiah(config[key])}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={busy || !valid}
          className="press rounded-full bg-cocoa-900 px-5 py-2 text-sm font-bold text-cream-50 disabled:opacity-50"
        >
          {busy ? t('pricing.processing') : t('admin.save')}
        </button>
        {saved && <span className="text-sm font-bold text-cocoa-500">{t('admin.saved')}</span>}
      </div>
    </div>
  )
}
