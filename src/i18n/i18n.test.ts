import { describe, expect, test } from 'vitest'
import { dict as id } from './locales/id'
import { dict as en } from './locales/en'

describe('i18n dictionaries', () => {
  test('id and en have identical key sets', () => {
    const idKeys = Object.keys(id).sort()
    const enKeys = Object.keys(en).sort()
    expect(enKeys).toEqual(idKeys)
  })

  test('no empty values in either dictionary', () => {
    for (const [k, v] of Object.entries(id)) {
      expect(v.trim().length, `id ${k}`).toBeGreaterThan(0)
    }
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim().length, `en ${k}`).toBeGreaterThan(0)
    }
  })
})
