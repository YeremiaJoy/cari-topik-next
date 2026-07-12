'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminService } from '../../services'
import type { AdminAnalytics, AdminStats, Depth } from '../../services/types'
import {
  BarList,
  CHART_COLORS,
  ChartLegend,
  Meter,
  Sparkline,
  StackedBarList,
  TrendChart,
} from '../../components/charts'

const DEPTHS: Depth[] = ['ringan', 'sedang', 'dalam']

function StatTile({ label, value, hint, trend }: {
  label: string
  value: string
  hint?: string
  trend?: number[]
}) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
      <p className="text-xs font-medium text-cocoa-500">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-black tabular-nums text-cocoa-900">{value}</p>
        {trend && <Sparkline points={trend} />}
      </div>
      {hint && <p className="mt-1 text-[11px] font-medium text-cocoa-500">{hint}</p>}
    </div>
  )
}

function Panel({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
      <h2 className="font-display text-base font-black text-cocoa-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-cocoa-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-3xl border border-cream-200 bg-cream-100/60" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-3xl border border-cream-200 bg-cream-100/60 lg:col-span-2" />
        <div className="h-64 rounded-3xl border border-cream-200 bg-cream-100/60" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-3xl border border-cream-200 bg-cream-100/60" />
        <div className="h-56 rounded-3xl border border-cream-200 bg-cream-100/60" />
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)

  useEffect(() => {
    void Promise.all([adminService.getStats(), adminService.getAnalytics()]).then(
      ([s, a]) => {
        setStats(s)
        setAnalytics(a)
      },
    )
  }, [])

  const weekLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
    })
    return (iso: string) => fmt.format(new Date(iso))
  }, [i18n.language])

  if (!stats || !analytics) return <OverviewSkeleton />

  const signupTrend = analytics.signupsByWeek.map((w) => w.count)
  const roomTrend = analytics.roomsByWeek.map((w) => w.count)
  const signupsThisWeek = signupTrend[signupTrend.length - 1] ?? 0
  const proPercent = stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0
  const avgFavorites = stats.totalRooms > 0 ? (stats.totalFavorites / stats.totalRooms).toFixed(1) : '0'

  const trendPoints = analytics.signupsByWeek.map((w) => ({
    label: weekLabel(w.weekStart),
    value: w.count,
  }))

  const depthColor = (depth: Depth) => CHART_COLORS.ramp[DEPTHS.indexOf(depth)]
  const bankRows = analytics.questionsByCategory.map((row) => ({
    label: t(`category.${row.category}.label`),
    segments: DEPTHS.map((depth) => ({
      key: t(`depth.${depth}`),
      value: row.counts[depth],
      color: depthColor(depth),
    })),
  }))

  const statusRows = [
    {
      label: t('admin.overview.roomStatus'),
      segments: [
        { key: t('admin.stats.activeRooms'), value: analytics.roomStatus.active, color: CHART_COLORS.mark },
        { key: t('admin.stats.completedRooms'), value: analytics.roomStatus.completed, color: CHART_COLORS.neutral },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t('admin.stats.totalUsers')}
          value={String(stats.totalUsers)}
          hint={signupsThisWeek > 0 ? t('admin.overview.thisWeek', { count: signupsThisWeek }) : undefined}
          trend={signupTrend}
        />
        <StatTile
          label={t('admin.stats.proUsers')}
          value={String(stats.proUsers)}
          hint={t('admin.overview.proShare', { percent: proPercent })}
        />
        <StatTile
          label={t('admin.stats.totalRooms')}
          value={String(stats.totalRooms)}
          hint={t('admin.overview.activeNow', { count: stats.activeRooms })}
          trend={roomTrend}
        />
        <StatTile
          label={t('admin.stats.totalFavorites')}
          value={String(stats.totalFavorites)}
          hint={t('admin.overview.avgFavorites', { avg: avgFavorites })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title={t('admin.overview.signupsTitle')} subtitle={t('admin.overview.last12Weeks')}>
            <TrendChart points={trendPoints} valueLabel={t('admin.overview.usersUnit')} />
          </Panel>
        </div>
        <Panel title={t('admin.overview.planMix')} subtitle={t('admin.stats.totalUsers')}>
          <p className="font-display text-3xl font-black tabular-nums text-cocoa-900">{proPercent}%</p>
          <p className="mt-0.5 text-xs text-cocoa-500">{t('admin.overview.proShareLong')}</p>
          <div className="mt-4">
            <Meter value={analytics.planCounts.pro} max={stats.totalUsers} label={t('admin.overview.planMix')} />
          </div>
          <dl className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-cocoa-700">
                <span className="h-2 w-2 rounded-sm" style={{ background: CHART_COLORS.mark }} aria-hidden="true" />
                {t('nav.planPro')}
              </dt>
              <dd className="text-xs font-bold tabular-nums text-cocoa-900">{analytics.planCounts.pro}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-cocoa-700">
                <span className="h-2 w-2 rounded-sm bg-cream-100" aria-hidden="true" />
                {t('nav.planFree')}
              </dt>
              <dd className="text-xs font-bold tabular-nums text-cocoa-900">{analytics.planCounts.free}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('admin.overview.roomsTitle')} subtitle={t('admin.overview.allTime')}>
          {stats.totalRooms === 0 ? (
            <p className="text-sm text-cocoa-500">{t('admin.overview.empty')}</p>
          ) : (
            <>
              <BarList
                items={analytics.roomsByCategory.map((r) => ({
                  label: t(`category.${r.category}.label`),
                  value: r.count,
                }))}
              />
              <div className="mt-5 border-t border-cream-200 pt-4">
                <StackedBarList rows={statusRows} total />
                <div className="mt-2">
                  <ChartLegend
                    items={[
                      { label: t('admin.stats.activeRooms'), color: CHART_COLORS.mark },
                      { label: t('admin.stats.completedRooms'), color: CHART_COLORS.neutral },
                    ]}
                  />
                </div>
              </div>
            </>
          )}
        </Panel>
        <Panel
          title={`${t('admin.stats.totalQuestions')} · ${stats.totalQuestions}`}
          subtitle={t('admin.overview.bankSubtitle')}
        >
          {stats.totalQuestions === 0 ? (
            <p className="text-sm text-cocoa-500">{t('admin.overview.empty')}</p>
          ) : (
            <>
              <StackedBarList rows={bankRows} total />
              <div className="mt-3">
                <ChartLegend
                  items={DEPTHS.map((depth) => ({
                    label: t(`depth.${depth}`),
                    color: depthColor(depth),
                  }))}
                />
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
