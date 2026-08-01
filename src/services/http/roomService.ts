import type { FlagCrowdStats, Room, RoomService } from '../types'
import { api, ApiError } from './client'
import type { QuestionCache } from './questionCache'

/** Deck dikomposisi & kuota ditegakkan di API route; klien tinggal fetch. */
export function createHttpRoomService(cache: QuestionCache): RoomService {
  return {
    async createRoom(setup) {
      return api<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(setup) })
    },
    async getRoom(id) {
      // Bank harus siap sebelum halaman sesi memetakan id kartu → pertanyaan.
      await cache.ensure()
      try {
        return await api<Room>(`/api/rooms/${id}`)
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) return null
        throw err
      }
    },
    async listRooms() {
      await cache.ensure()
      return api<Room[]>('/api/rooms')
    },
    async advanceCard(roomId) {
      return api<Room>(`/api/rooms/${roomId}/advance`, { method: 'POST' })
    },
    async toggleFavorite(roomId, questionId) {
      return api<Room>(`/api/rooms/${roomId}/favorites/${questionId}`, { method: 'POST' })
    },
    async endSession(roomId) {
      return api<Room>(`/api/rooms/${roomId}/end`, { method: 'POST' })
    },
    async setFlagMode(roomId, enabled) {
      return api<Room>(`/api/rooms/${roomId}/flag-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
    },
    async saveFlagVotes(roomId, questionId, votes) {
      return api<{ room: Room; stats: FlagCrowdStats }>(`/api/rooms/${roomId}/flag-votes/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(votes),
      })
    },
    async deleteRoom(roomId) {
      await api<void>(`/api/rooms/${roomId}`, { method: 'DELETE' })
    },
  }
}
