import { describe, expect, test } from 'vitest'
import { createMemoryStore, createLocalStorageStore } from './storage'

describe('KVStore', () => {
  test('memory store: set lalu get mengembalikan nilai', () => {
    const store = createMemoryStore()
    store.set('kunci', { a: 1 })
    expect(store.get<{ a: number }>('kunci')).toEqual({ a: 1 })
  })

  test('get key yang tidak ada mengembalikan null', () => {
    expect(createMemoryStore().get('tidak-ada')).toBeNull()
  })

  test('remove menghapus nilai', () => {
    const store = createMemoryStore()
    store.set('kunci', 1)
    store.remove('kunci')
    expect(store.get('kunci')).toBeNull()
  })

  test('localStorage store: fallback in-memory saat localStorage tidak tersedia (env node)', () => {
    const store = createLocalStorageStore()
    store.set('kunci', 'nilai')
    expect(store.get<string>('kunci')).toBe('nilai')
  })
})
