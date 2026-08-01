import { describe, expect, test } from 'vitest'
import { buildDeck, WARMUP_CARDS } from './deck'
import type { Question, RoomSetup } from '../services/types'

const identity = <T,>(items: T[]): T[] => [...items]

const q = (
  id: string,
  depth: Question['depth'],
  bias: Question['bias'],
  forGroup = false,
  category: Question['category'] = 'pasangan',
  type: Question['type'] = 'question',
): Question => ({
  id,
  text: { id: `t-${id}`, en: `t-${id}` },
  category,
  depth,
  bias,
  forGroup: forGroup || undefined,
  type,
})

const BANK: Question[] = [
  q('d1', 'dalam', 'netral'),
  q('r1', 'ringan', 'introvert'),
  q('r2', 'ringan', 'extrovert'),
  q('s1', 'sedang', 'netral'),
  q('g1', 'ringan', 'netral', true),
  q('x1', 'ringan', 'netral', false, 'teman'),
]

const pairSetup = (personalities?: RoomSetup['personalities']): RoomSetup => ({
  participantCount: 2,
  category: 'pasangan',
  personalities,
})

const FLAGS: Question[] = [
  q('f1', 'ringan', 'netral', false, 'pasangan', 'flag'),
  q('f2', 'ringan', 'netral', false, 'pasangan', 'flag'),
]

/** 8 kartu klasik → dua slot inline (indeks gabungan 4 dan 9). */
const BIG_BANK: Question[] = [
  ...Array.from({ length: 8 }, (_, i) => q(`c${i}`, 'ringan', 'netral')),
  ...FLAGS,
]

describe('buildDeck', () => {
  test('filter kategori + mode, dua kartu ringan dulu lalu sisanya acak', () => {
    const { deck } = buildDeck(BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 'd1', 's1'])
  })

  test('dua kartu pertama selalu ringan', () => {
    const { deck } = buildDeck(BANK, pairSetup(), identity)
    expect(deck.slice(0, WARMUP_CARDS).map((x) => x.depth)).toEqual(['ringan', 'ringan'])
  })

  test('setelah pemanasan kedalaman tidak lagi berurutan', () => {
    // d1 (dalam) muncul sebelum s1 (sedang) — mustahil di urutan lama.
    const { deck } = buildDeck(BANK, pairSetup(), identity)
    const after = deck.slice(WARMUP_CARDS).map((x) => x.depth)
    expect(after).toEqual(['dalam', 'sedang'])
  })

  test('tiap kartu muncul tepat sekali, tidak ada yang hilang atau dobel', () => {
    const { deck } = buildDeck(BANK, pairSetup(), identity)
    const ids = deck.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(['d1', 'r1', 'r2', 's1'])
  })

  test('kartu ringan lebih sedikit dari jatah pemanasan tidak bikin error', () => {
    const bank = [q('r1', 'ringan', 'netral'), q('s1', 'sedang', 'netral')]
    const { deck } = buildDeck(bank, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 's1'])
  })

  test('mode grup hanya kartu forGroup', () => {
    const { deck } = buildDeck(BANK, { participantCount: 3, category: 'pasangan' }, identity)
    expect(deck.map((x) => x.id)).toEqual(['g1'])
  })

  test('dua introvert → bias extrovert ke belakang', () => {
    const { deck } = buildDeck(BANK, pairSetup(['introvert', 'introvert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 'd1', 's1'])
    // Dua extrovert membalik urutan pemanasan: r2 (extrovert) naik duluan.
    const twoExtro = buildDeck(BANK, pairSetup(['extrovert', 'extrovert']), identity)
    expect(twoExtro.deck.map((x) => x.id)).toEqual(['r2', 'r1', 'd1', 's1'])
  })

  test('kepribadian beda → tanpa deprioritas', () => {
    const { deck } = buildDeck(BANK, pairSetup(['introvert', 'extrovert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 'd1', 's1'])
  })

  test('kartu flag disisipkan tiap 4 kartu klasik, tidak pernah di indeks 0', () => {
    const { deck } = buildDeck(BIG_BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual([
      'c0', 'c1', 'c2', 'c3', 'f1',
      'c4', 'c5', 'c6', 'c7', 'f2',
    ])
    expect(deck[0].type).toBe('question')
  })

  test('sisa kartu flag masuk ke flagReserve', () => {
    const bank = [...BIG_BANK, q('f3', 'ringan', 'netral', false, 'pasangan', 'flag')]
    const { deck, flagReserve } = buildDeck(bank, pairSetup(), identity)
    expect(deck.filter((x) => x.type === 'flag').map((x) => x.id)).toEqual(['f1', 'f2'])
    expect(flagReserve.map((x) => x.id)).toEqual(['f3'])
  })

  test('inline dibatasi jumlah kartu flag yang tersedia', () => {
    const bank = [...Array.from({ length: 8 }, (_, i) => q(`c${i}`, 'ringan', 'netral')), FLAGS[0]]
    const { deck, flagReserve } = buildDeck(bank, pairSetup(), identity)
    expect(deck.filter((x) => x.type === 'flag')).toHaveLength(1)
    expect(flagReserve).toEqual([])
  })

  test('mode grup tidak dapat kartu flag', () => {
    const bank = [...BIG_BANK, q('g2', 'ringan', 'netral', true)]
    const { deck, flagReserve } = buildDeck(bank, { participantCount: 3, category: 'pasangan' }, identity)
    expect(deck.every((x) => x.type === 'question')).toBe(true)
    expect(flagReserve).toEqual([])
  })

  test('kategori teman tidak dapat kartu flag', () => {
    const bank = [
      ...Array.from({ length: 8 }, (_, i) => q(`t${i}`, 'ringan', 'netral', false, 'teman')),
      ...FLAGS,
    ]
    const { deck, flagReserve } = buildDeck(bank, { participantCount: 2, category: 'teman' }, identity)
    expect(deck.every((x) => x.type === 'question')).toBe(true)
    expect(flagReserve).toEqual([])
  })

  test('bank tanpa kartu flag → deck klasik saja, reserve kosong', () => {
    const { deck, flagReserve } = buildDeck(BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 'd1', 's1'])
    expect(flagReserve).toEqual([])
  })
})
