'use client'

import { useId, useState } from 'react'

/**
 * Warna grafik: satu keluarga terracotta (ramp ordinal tervalidasi
 * scripts dataviz: monotone L, ΔL ≥ 0.06, ujung terang ≥ 2:1 di putih).
 */
export const CHART_COLORS = {
  mark: '#d64a1e',
  markSoft: 'rgba(238, 95, 44, 0.14)',
  ramp: ['#f47c4e', '#d64a1e', '#a93a1a'] as const,
  neutral: '#e7d8b8',
  grid: '#f3e8cd',
  axis: '#8a6650',
}

/* ---------- Sparkline (dalam stat tile) ---------- */

export function Sparkline({ points, width = 96, height = 28 }: {
  points: number[]
  width?: number
  height?: number
}) {
  if (points.length < 2) return null
  const max = Math.max(...points, 1)
  const step = width / (points.length - 1)
  const y = (v: number) => height - 3 - (v / max) * (height - 6)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <path d={d} fill="none" stroke={CHART_COLORS.mark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- Grafik tren mingguan (area + garis + tooltip) ---------- */

export interface TrendPoint {
  label: string
  value: number
}

const niceCeil = (n: number) => {
  if (n <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(n))
  const unit = pow / 2
  return Math.ceil(n / unit) * unit
}

export function TrendChart({ points, valueLabel }: { points: TrendPoint[]; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()

  const W = 560
  const H = 190
  const pad = { left: 30, right: 10, top: 12, bottom: 22 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const yMax = niceCeil(Math.max(...points.map((p) => p.value), 1))
  const x = (i: number) => pad.left + (i / (points.length - 1)) * innerW
  const y = (v: number) => pad.top + innerH - (v / yMax) * innerH

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${pad.left},${(pad.top + innerH).toFixed(1)} Z`

  const ticks = [0, yMax / 2, yMax]
  const xLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1]

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - pad.left) / innerW) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={valueLabel}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(238, 95, 44, 0.20)" />
            <stop offset="100%" stopColor="rgba(238, 95, 44, 0.02)" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={W - pad.right} y1={y(tick)} y2={y(tick)} stroke={CHART_COLORS.grid} strokeWidth="1" />
            <text x={pad.left - 6} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill={CHART_COLORS.axis} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tick}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={CHART_COLORS.mark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill={CHART_COLORS.axis}>
            {points[i]?.label}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke={CHART_COLORS.axis} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={CHART_COLORS.mark} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-cocoa-900 px-2.5 py-1.5 text-cream-50 shadow-warm-md"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="text-[10px] font-medium opacity-70">{points[hover].label}</p>
          <p className="text-xs font-bold tabular-nums">{points[hover].value} {valueLabel}</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Daftar bar horizontal (satu hue, label nilai langsung) ---------- */

export function BarList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="group">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-medium text-cocoa-700">{item.label}</span>
            <span className="text-xs font-bold tabular-nums text-cocoa-900">{item.value}</span>
          </div>
          <div className="h-2.5">
            <div
              className="h-full rounded-r transition-all duration-300 group-hover:opacity-80"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`, background: CHART_COLORS.mark }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Bar bertumpuk (ramp ordinal, celah 2px) ---------- */

export interface StackSegment {
  key: string
  value: number
  color: string
}

export function StackedBarList({ rows, total }: {
  rows: Array<{ label: string; segments: StackSegment[] }>
  total?: boolean
}) {
  const max = Math.max(...rows.map((r) => r.segments.reduce((s, seg) => s + seg.value, 0)), 1)
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const sum = row.segments.reduce((s, seg) => s + seg.value, 0)
        return (
          <li key={row.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-cocoa-700">{row.label}</span>
              {total && <span className="text-xs font-bold tabular-nums text-cocoa-900">{sum}</span>}
            </div>
            <div className="flex h-2.5 gap-[2px]" style={{ width: `${(sum / max) * 100}%` }}>
              {row.segments.filter((seg) => seg.value > 0).map((seg) => (
                <div
                  key={seg.key}
                  title={`${seg.key}: ${seg.value}`}
                  className="h-full first:rounded-l last:rounded-r"
                  style={{ flexGrow: seg.value, background: seg.color }}
                />
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cocoa-500">
          <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/* ---------- Meter rasio (track satu keluarga warna) ---------- */

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: CHART_COLORS.mark }} />
      </div>
    </div>
  )
}
