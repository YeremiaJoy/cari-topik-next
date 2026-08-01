import { describe, expect, test } from 'vitest'
import { daysUntil, formatCountdown, isRenewalDue } from './countdown'

describe('formatCountdown', () => {
  test('format jam:menit:detik dengan padding nol', () => {
    expect(formatCountdown(((1 * 60 + 2) * 60 + 3) * 1000)).toBe('01:02:03')
  })

  test('nol dan negatif menjadi 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00')
    expect(formatCountdown(-5000)).toBe('00:00:00')
  })

  test('tepat 6 jam', () => {
    expect(formatCountdown(6 * 60 * 60 * 1000)).toBe('06:00:00')
  })

  test('membulatkan ke atas ke detik penuh', () => {
    expect(formatCountdown(1500)).toBe('00:00:02')
    expect(formatCountdown(59_999)).toBe('00:01:00')
  })
})

describe('daysUntil', () => {
  const now = Date.parse('2026-08-01T00:00:00.000Z')

  test('membulatkan ke atas supaya sisa jam tetap terhitung sehari', () => {
    expect(daysUntil('2026-08-01T06:00:00.000Z', now)).toBe(1)
  })

  test('menghitung sisa hari penuh', () => {
    expect(daysUntil('2026-08-31T00:00:00.000Z', now)).toBe(30)
  })

  test('tanggal yang sudah lewat jadi nol, bukan negatif', () => {
    expect(daysUntil('2026-07-01T00:00:00.000Z', now)).toBe(0)
  })

  test('null saat tidak ada masa berlaku atau tanggalnya ngawur', () => {
    expect(daysUntil(undefined, now)).toBeNull()
    expect(daysUntil('bukan-tanggal', now)).toBeNull()
  })
})

describe('isRenewalDue', () => {
  const now = Date.parse('2026-08-01T00:00:00.000Z')

  test('di dalam jendela perpanjangan', () => {
    expect(isRenewalDue('2026-08-20T00:00:00.000Z', now)).toBe(true)
  })

  test('masih lama, belum perlu ditawari', () => {
    expect(isRenewalDue('2027-07-11T00:00:00.000Z', now)).toBe(false)
  })

  test('akun tanpa masa berlaku tidak pernah ditawari', () => {
    expect(isRenewalDue(undefined, now)).toBe(false)
  })
})
