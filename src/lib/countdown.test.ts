import { describe, expect, test } from 'vitest'
import { formatCountdown } from './countdown'

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
