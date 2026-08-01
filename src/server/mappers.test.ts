import { describe, expect, test } from 'vitest'
import { toQuestion } from './mappers'
import type { QuestionRow } from './mappers'

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
