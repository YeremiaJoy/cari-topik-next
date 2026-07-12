'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'
import type { Bias, Category, Depth, Question } from '../../services/types'

const CATEGORIES: Category[] = ['pasangan', 'teman', 'keluarga']
const DEPTHS: Depth[] = ['ringan', 'sedang', 'dalam']
const BIASES: Bias[] = ['introvert', 'extrovert', 'netral']

interface FormState {
  textId: string
  textEn: string
  category: Category
  depth: Depth
  bias: Bias
  forGroup: boolean
}

const EMPTY_FORM: FormState = {
  textId: '',
  textEn: '',
  category: 'teman',
  depth: 'ringan',
  bias: 'netral',
  forGroup: false,
}

const fieldClass =
  'w-full rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-sm text-cocoa-900 focus:border-terracotta-400 focus:outline-none'
const labelClass = 'mb-1.5 block text-xs font-bold uppercase text-cocoa-500'

export default function AdminQuestionsPage() {
  const { t } = useTranslation()
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Category | 'all'>('all')

  useEffect(() => {
    adminService.listQuestions().then(setQuestions)
  }, [])

  const refresh = async () => setQuestions(await adminService.listQuestions())

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId('new')
  }

  const startEdit = (q: Question) => {
    setForm({
      textId: q.text.id,
      textEn: q.text.en,
      category: q.category,
      depth: q.depth,
      bias: q.bias,
      forGroup: Boolean(q.forGroup),
    })
    setEditingId(q.id)
  }

  const handleSave = async () => {
    if (!form.textId.trim() || !form.textEn.trim()) return
    setBusy(true)
    try {
      const input = {
        text: { id: form.textId.trim(), en: form.textEn.trim() },
        category: form.category,
        depth: form.depth,
        bias: form.bias,
        forGroup: form.forGroup || undefined,
      }
      if (editingId === 'new') await adminService.createQuestion(input)
      else if (editingId) await adminService.updateQuestion(editingId, input)
      await refresh()
      setEditingId(null)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (q: Question) => {
    if (!window.confirm(t('admin.questions.deleteConfirm'))) return
    setBusy(true)
    try {
      await adminService.deleteQuestion(q.id)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!questions) return <p className="text-sm text-cocoa-500">{t('common.loading')}</p>

  const visible = filter === 'all' ? questions : questions.filter((q) => q.category === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`press rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === c
                  ? 'bg-cocoa-900 text-cream-50'
                  : 'border border-cream-200 bg-white/60 text-cocoa-700 hover:bg-cream-100'
              }`}
            >
              {c === 'all' ? t('admin.questions.all') : t(`category.${c}.label`)}
            </button>
          ))}
        </div>
        <button
          onClick={startCreate}
          className="press rounded-full bg-terracotta-500 px-4 py-2 text-sm font-bold text-white shadow-warm-sm hover:bg-terracotta-600"
        >
          {t('admin.questions.add')}
        </button>
      </div>

      <p className="text-xs text-cocoa-500">
        {t('admin.questions.count', { count: visible.length })}
      </p>

      {editingId && (
        <div className="rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
          <h2 className="font-display text-lg font-black text-cocoa-900">
            {editingId === 'new' ? t('admin.questions.add') : t('admin.questions.edit')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="q-text-id">
                {t('admin.questions.textId')}
              </label>
              <textarea
                id="q-text-id"
                value={form.textId}
                onChange={(e) => setForm({ ...form, textId: e.target.value })}
                rows={2}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="q-text-en">
                {t('admin.questions.textEn')}
              </label>
              <textarea
                id="q-text-en"
                value={form.textEn}
                onChange={(e) => setForm({ ...form, textEn: e.target.value })}
                rows={2}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="q-category">
                {t('admin.questions.category')}
              </label>
              <select
                id="q-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className={fieldClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}.label`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="q-depth">
                {t('admin.questions.depth')}
              </label>
              <select
                id="q-depth"
                value={form.depth}
                onChange={(e) => setForm({ ...form, depth: e.target.value as Depth })}
                className={fieldClass}
              >
                {DEPTHS.map((d) => (
                  <option key={d} value={d}>
                    {t(`depth.${d}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="q-bias">
                {t('admin.questions.bias')}
              </label>
              <select
                id="q-bias"
                value={form.bias}
                onChange={(e) => setForm({ ...form, bias: e.target.value as Bias })}
                className={fieldClass}
              >
                {BIASES.map((b) => (
                  <option key={b} value={b}>
                    {b === 'netral' ? t('admin.bias.netral') : t(`personality.${b}.label`)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-cocoa-700">
              <input
                type="checkbox"
                checked={form.forGroup}
                onChange={(e) => setForm({ ...form, forGroup: e.target.checked })}
                className="h-4 w-4 accent-terracotta-500"
              />
              {t('admin.questions.forGroup')}
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleSave}
              disabled={busy || !form.textId.trim() || !form.textEn.trim()}
              className="press rounded-full bg-cocoa-900 px-5 py-2 text-sm font-bold text-cream-50 disabled:opacity-50"
            >
              {t('admin.save')}
            </button>
            <button
              onClick={() => setEditingId(null)}
              disabled={busy}
              className="press rounded-full border border-cream-200 px-5 py-2 text-sm font-bold text-cocoa-700 hover:bg-cream-100"
            >
              {t('admin.cancel')}
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((q) => (
          <li
            key={q.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-warm-sm"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-cocoa-900">{q.text.id}</p>
              <p className="mt-0.5 truncate text-xs text-cocoa-500">{q.text.en}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase">
                <span className="rounded-full bg-cream-100 px-2 py-0.5 text-cocoa-700">
                  {t(`category.${q.category}.label`)}
                </span>
                <span className="rounded-full bg-cream-100 px-2 py-0.5 text-cocoa-700">
                  {t(`depth.${q.depth}`)}
                </span>
                {q.forGroup && (
                  <span className="rounded-full bg-butter-100 px-2 py-0.5 text-cocoa-700">
                    {t('common.modeGroup')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => startEdit(q)}
                disabled={busy}
                className="press rounded-full px-3 py-1.5 text-xs font-bold text-cocoa-700 hover:bg-cream-100"
              >
                {t('admin.edit')}
              </button>
              <button
                onClick={() => void handleDelete(q)}
                disabled={busy}
                className="press rounded-full px-3 py-1.5 text-xs font-bold text-terracotta-600 hover:bg-terracotta-500/10"
              >
                {t('admin.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
