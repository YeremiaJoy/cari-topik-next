import { createHttpAuthService } from './http/authService'
import { createHttpRoomService } from './http/roomService'
import { createHttpAdminService } from './http/adminService'
import { createHttpConfigStore } from './http/configStore'
import { createQuestionCache } from './http/questionCache'
import { buildDeck } from '../lib/deck'
import type { QuestionService } from './types'

// Semua service bicara ke API route Next (/api/*); aturan bisnis hidup di
// server. Cache bank pertanyaan tetap di klien untuk memetakan id → teks.
const questionCache = createQuestionCache()

/** getById sinkron dari cache; deck room dikomposisi server (POST /api/rooms). */
function createClientQuestionService(): QuestionService {
  return {
    buildDeck: (setup) => buildDeck(questionCache.list(), setup),
    getById: (id) => questionCache.list().find((q) => q.id === id),
  }
}

export const appConfig = createHttpConfigStore()
export const authService = createHttpAuthService()
export const questionService = createClientQuestionService()
export const roomService = createHttpRoomService(questionCache)
export const adminService = createHttpAdminService(appConfig, questionCache)
