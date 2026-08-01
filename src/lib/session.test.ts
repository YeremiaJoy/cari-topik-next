import { describe, expect, test } from 'vitest'
import { advancePools, currentCardId, playedCount } from './session'
import type { PoolCursors } from './session'

const base: PoolCursors = {
  deckLength: 5,
  reserveLength: 3,
  currentIndex: 0,
  flagIndex: 0,
  currentPool: 'deck',
  flagMode: false,
}

describe('currentCardId', () => {
  const room = {
    deck: ['d0', 'd1'],
    currentIndex: 1,
    flagReserve: ['f0', 'f1'],
    flagIndex: 0,
    currentPool: 'deck' as const,
  }

  test('ambil dari deck saat pool deck', () => {
    expect(currentCardId(room)).toBe('d1')
  })

  test('ambil dari reserve saat pool flag', () => {
    expect(currentCardId({ ...room, currentPool: 'flag', flagIndex: 1 })).toBe('f1')
  })

  test('undefined saat kursor lewat ujung', () => {
    expect(currentCardId({ ...room, currentIndex: 9 })).toBeUndefined()
  })
})

describe('advancePools', () => {
  test('maju di deck saat mode flag mati', () => {
    const out = advancePools(base)
    expect(out.currentIndex).toBe(1)
    expect(out.flagIndex).toBe(0)
    expect(out.currentPool).toBe('deck')
    expect(out.played).toBe(1)
    expect(out.completed).toBe(false)
  })

  test('mode flag aktif → kartu berikutnya dari reserve', () => {
    const out = advancePools({ ...base, flagMode: true })
    expect(out.currentPool).toBe('flag')
    expect(out.currentIndex).toBe(1)
    expect(out.flagIndex).toBe(0)
  })

  test('maju di reserve hanya menggeser flagIndex', () => {
    const out = advancePools({ ...base, currentPool: 'flag', flagMode: true, currentIndex: 2 })
    expect(out.flagIndex).toBe(1)
    expect(out.currentIndex).toBe(2)
    expect(out.currentPool).toBe('flag')
  })

  test('played menjumlahkan kedua kursor', () => {
    const out = advancePools({ ...base, currentIndex: 2, flagIndex: 1, currentPool: 'flag', flagMode: true })
    expect(out.played).toBe(4)
  })

  test('matikan mode flag → kembali ke deck di kartu berikutnya', () => {
    const out = advancePools({ ...base, currentPool: 'flag', flagIndex: 1, flagMode: false })
    expect(out.currentPool).toBe('deck')
    expect(out.flagIndex).toBe(2)
    expect(out.currentIndex).toBe(0)
  })

  test('reserve habis → fallback ke deck dan flagMode dimatikan', () => {
    const out = advancePools({
      ...base,
      currentPool: 'flag',
      flagIndex: 2,
      reserveLength: 3,
      flagMode: true,
    })
    expect(out.flagIndex).toBe(3)
    expect(out.flagExhausted).toBe(true)
    expect(out.flagMode).toBe(false)
    expect(out.currentPool).toBe('deck')
  })

  test('selesai saat deck habis', () => {
    const out = advancePools({ ...base, currentIndex: 4 })
    expect(out.completed).toBe(true)
  })

  test('belum selesai selama masih ada kartu flag di mode flag', () => {
    const out = advancePools({ ...base, currentIndex: 4, flagMode: true })
    expect(out.currentPool).toBe('flag')
    expect(out.completed).toBe(false)
  })

  test('reserve tersisa tapi mode flag mati → deck habis tetap selesai', () => {
    const out = advancePools({ ...base, currentIndex: 4, flagMode: false, reserveLength: 3 })
    expect(out.completed).toBe(true)
  })
})

describe('playedCount', () => {
  test('menjumlahkan currentIndex dan flagIndex ditambah satu', () => {
    expect(playedCount({ currentIndex: 0, flagIndex: 0 })).toBe(1)
    expect(playedCount({ currentIndex: 2, flagIndex: 5 })).toBe(8)
  })

  test('tetap menghitung kartu reserve walau currentIndex nol', () => {
    expect(playedCount({ currentIndex: 0, flagIndex: 4 })).toBe(5)
  })
})
