import type { Question } from '../types'
import { api } from './client'

/**
 * Cache bank pertanyaan di memori klien supaya QuestionService (interface
 * sinkron: getById) tetap bisa dipakai halaman sesi. roomService memanggil
 * ensure() sebelum operasi yang butuh bank; admin CRUD memanggil invalidate().
 */
export interface QuestionCache {
  list(): Question[]
  ensure(): Promise<void>
  invalidate(): void
}

export function createQuestionCache(): QuestionCache {
  let cache: Question[] = []
  let loaded = false
  let inflight: Promise<void> | null = null

  const fetchAll = async () => {
    cache = await api<Question[]>('/api/questions')
    loaded = true
  }

  return {
    list: () => cache,
    ensure() {
      if (loaded) return Promise.resolve()
      inflight ??= fetchAll().finally(() => {
        inflight = null
      })
      return inflight
    },
    invalidate() {
      loaded = false
    },
  }
}
