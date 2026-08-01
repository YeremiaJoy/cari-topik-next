import { describe, expect, test } from 'vitest'
import {
  DIVISIVE_MIN_VOTES,
  aggregateQuestionStats,
  isDivisive,
  redSharePercent,
  type RoomStatsSource,
} from './analytics'

const room = (over: Partial<RoomStatsSource> = {}): RoomStatsSource => ({
  deck: ['d0', 'd1', 'd2'],
  currentIndex: 0,
  flagReserve: [],
  flagIndex: 0,
  currentPool: 'deck',
  favorites: [],
  flagVotes: {},
  ...over,
})

const find = (stats: ReturnType<typeof aggregateQuestionStats>, id: string) =>
  stats.find((s) => s.questionId === id)

describe('aggregateQuestionStats', () => {
  test('hanya menghitung kartu yang benar-benar tampil, bukan seisi dek', () => {
    const stats = aggregateQuestionStats([room({ currentIndex: 1 })])
    expect(find(stats, 'd0')?.played).toBe(1)
    expect(find(stats, 'd1')?.played).toBe(1)
    // d2 masih nangkring di ekor dek, belum pernah kelihatan.
    expect(find(stats, 'd2')).toBeUndefined()
  })

  test('menjumlahkan tayangan dari beberapa room', () => {
    const stats = aggregateQuestionStats([room(), room(), room({ currentIndex: 2 })])
    expect(find(stats, 'd0')?.played).toBe(3)
    expect(find(stats, 'd2')?.played).toBe(1)
  })

  test('favorit terhitung walau kartunya dari room berbeda', () => {
    const stats = aggregateQuestionStats([
      room({ favorites: ['d0'] }),
      room({ favorites: ['d0', 'd1'] }),
    ])
    expect(find(stats, 'd0')?.favorites).toBe(2)
    expect(find(stats, 'd1')?.favorites).toBe(1)
  })

  test('tiap kartu flag menyumbang dua suara, satu per pasangan', () => {
    const stats = aggregateQuestionStats([
      room({ flagVotes: { f1: { p1: 'red', p2: 'green' } } }),
      room({ flagVotes: { f1: { p1: 'red', p2: 'red' } } }),
    ])
    expect(find(stats, 'f1')?.red).toBe(3)
    expect(find(stats, 'f1')?.green).toBe(1)
  })

  test('kartu yang difavoritkan tapi belum tampil tetap muncul di rekap', () => {
    const stats = aggregateQuestionStats([room({ favorites: ['zz'] })])
    expect(find(stats, 'zz')).toEqual({
      questionId: 'zz',
      played: 0,
      favorites: 1,
      red: 0,
      green: 0,
    })
  })

  test('tanpa room sama sekali hasilnya kosong', () => {
    expect(aggregateQuestionStats([])).toEqual([])
  })
})

describe('redSharePercent', () => {
  test('membulatkan porsi merah', () => {
    expect(redSharePercent({ red: 3, green: 1 })).toBe(75)
    expect(redSharePercent({ red: 1, green: 2 })).toBe(33)
  })

  test('null saat belum ada suara sama sekali', () => {
    expect(redSharePercent({ red: 0, green: 0 })).toBeNull()
  })
})

describe('isDivisive', () => {
  test('sebaran seimbang di atas ambang suara dianggap bikin debat', () => {
    expect(isDivisive({ red: 5, green: 5 })).toBe(true)
    expect(isDivisive({ red: 4, green: 6 })).toBe(true)
  })

  test('sebaran berat sebelah berarti kartu mati', () => {
    expect(isDivisive({ red: 9, green: 1 })).toBe(false)
    expect(isDivisive({ red: 0, green: 10 })).toBe(false)
  })

  test('suara terlalu sedikit belum bisa disimpulkan', () => {
    expect(isDivisive({ red: 2, green: 2 })).toBe(false)
    expect(isDivisive({ red: 0, green: 0 })).toBe(false)
  })

  test('tepat di ambang suara sudah dihitung', () => {
    const half = DIVISIVE_MIN_VOTES / 2
    expect(isDivisive({ red: half, green: half })).toBe(true)
  })
})
