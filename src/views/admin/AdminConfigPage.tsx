'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'
import { formatRupiah } from '../../services/types'
import type { AppConfig } from '../../services/types'

type NumericConfigKey =
  | 'freeMaxParticipants'
  | 'freeMaxQuestions'
  | 'freeMaxRooms'
  | 'proPrice'
  | 'proPriceAfterDiscount'

const FIELDS: Array<{ key: NumericConfigKey; label: string; money?: boolean }> = [
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

  const maintenance = config.maintenance ?? { enabled: false, message: { id: '', en: '' } }
  const valid = FIELDS.every(({ key }) => Number.isFinite(config[key]) && config[key] > 0)

  return (
    <div className="max-w-xl rounded-3xl border border-cream-200 bg-white p-6 shadow-warm-sm">
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

      <div className="mt-6 border-t border-cream-200 pt-6">
        <label className="flex items-center gap-3 text-sm font-bold text-cocoa-800">
          <input
            type="checkbox"
            checked={maintenance.enabled}
            onChange={(e) => {
              setSaved(false)
              setConfig({
                ...config,
                maintenance: {
                  ...maintenance,
                  enabled: e.target.checked,
                },
              })
            }}
            className="h-4 w-4 rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-400"
          />
          {t('admin.config.maintenanceEnabled')}
        </label>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-cocoa-500" htmlFor="maintenance-id">
              {t('admin.config.maintenanceMessageId')}
            </label>
            <textarea
              id="maintenance-id"
              value={maintenance.message.id}
              onChange={(e) => {
                setSaved(false)
                setConfig({
                  ...config,
                  maintenance: {
                    ...maintenance,
                    message: { ...maintenance.message, id: e.target.value },
                  },
                })
              }}
              rows={3}
              className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 focus:border-terracotta-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-cocoa-500" htmlFor="maintenance-en">
              {t('admin.config.maintenanceMessageEn')}
            </label>
            <textarea
              id="maintenance-en"
              value={maintenance.message.en}
              onChange={(e) => {
                setSaved(false)
                setConfig({
                  ...config,
                  maintenance: {
                    ...maintenance,
                    message: { ...maintenance.message, en: e.target.value },
                  },
                })
              }}
              rows={3}
              className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 focus:border-terracotta-400 focus:outline-none"
            />
          </div>
        </div>
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
