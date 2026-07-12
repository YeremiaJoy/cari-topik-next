import { describe, expect, test } from 'vitest'
import { buildDeck } from './deck'
import type { Question, RoomSetup } from '../services/types'

const identity = <T,>(items: T[]): T[] => [...items]

const q = (
  id: string,
  depth: Question['depth'],
  bias: Question['bias'],
  forGroup = false,
  category: Question['category'] = 'pasangan',
): Question => ({
  id,
  text: { id: `t-${id}`, en: `t-${id}` },
  category,
  depth,
  bias,
  forGroup: forGroup || undefined,
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

describe('buildDeck', () => {
  test('filter kategori + mode, urut ringan → sedang → dalam', () => {
    const deck = buildDeck(BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
  })

  test('mode grup hanya kartu forGroup', () => {
    const deck = buildDeck(BANK, { participantCount: 3, category: 'pasangan' }, identity)
    expect(deck.map((x) => x.id)).toEqual(['g1'])
  })

  test('dua introvert → bias extrovert ke belakang tiap blok', () => {
    const deck = buildDeck(BANK, pairSetup(['introvert', 'introvert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
    const twoExtro = buildDeck(BANK, pairSetup(['extrovert', 'extrovert']), identity)
    expect(twoExtro.map((x) => x.id)).toEqual(['r2', 'r1', 's1', 'd1'])
  })

  test('kepribadian beda → tanpa deprioritas', () => {
    const deck = buildDeck(BANK, pairSetup(['introvert', 'extrovert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
  })
})
