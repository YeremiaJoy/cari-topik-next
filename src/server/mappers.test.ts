import { describe, expect, test } from 'vitest'
import { toQuestion, toRoom } from './mappers'
import type { QuestionRow, RoomRow } from './mappers'

const row: QuestionRow = {
  id: 'q1',
  question_code: 'q-001',
  text_id: 'teks id',
  text_en: 'text en',
  category: 'pasangan',
  depth: 'ringan',
  bias: 'netral',
  for_group: false,
  type: 'question',
}

describe('toQuestion', () => {
  test('meneruskan type dari row', () => {
    expect(toQuestion(row).type).toBe('question')
    expect(toQuestion({ ...row, type: 'flag' }).type).toBe('flag')
  })
})

const roomRow: RoomRow = {
  id: 'r1',
  user_id: 'u1',
  participant_count: 2,
  category: 'pasangan',
  personalities: null,
  deck: ['d0', 'd1'],
  current_index: 0,
  favorites: [],
  status: 'active',
  window_start: 0,
  exhausted_at: null,
  created_at: '2026-08-01T00:00:00.000Z',
  ended_at: null,
  flag_mode: true,
  flag_reserve: ['f0'],
  flag_index: 0,
  current_pool: 'flag',
  flag_votes: { f0: { p1: 'red', p2: 'green' } },
}

describe('toRoom', () => {
  test('memetakan kolom flag ke camelCase', () => {
    const room = toRoom(roomRow)
    expect(room.flagMode).toBe(true)
    expect(room.flagReserve).toEqual(['f0'])
    expect(room.flagIndex).toBe(0)
    expect(room.currentPool).toBe('flag')
    expect(room.flagVotes).toEqual({ f0: { p1: 'red', p2: 'green' } })
  })
})
