import type {
  AdminAnalytics,
  AdminService,
  AdminStats,
  Announcement,
  AppConfig,
  Question,
  User,
} from '../types'
import { api } from './client'
import type { ConfigStore } from './configStore'
import type { QuestionCache } from './questionCache'

export function createHttpAdminService(
  config: ConfigStore,
  questionCache: QuestionCache,
): AdminService {
  return {
    getStats: () => api<AdminStats>('/api/admin/stats'),
    getAnalytics: () => api<AdminAnalytics>('/api/admin/analytics'),
    listUsers: () => api<User[]>('/api/admin/users'),
    setUserPlan: (id, plan) =>
      api<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
    async deleteUser(id) {
      await api<void>(`/api/admin/users/${id}`, { method: 'DELETE' })
    },
    listQuestions: () => api<Question[]>('/api/admin/questions'),
    async createQuestion(input) {
      const created = await api<Question>('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      questionCache.invalidate()
      return created
    },
    async updateQuestion(id, patch) {
      const updated = await api<Question>(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      questionCache.invalidate()
      return updated
    },
    async deleteQuestion(id) {
      await api<void>(`/api/admin/questions/${id}`, { method: 'DELETE' })
      questionCache.invalidate()
    },
    getConfig: () => config.refresh(),
    updateConfig: (patch) => config.update(patch),
    getAnnouncement: () => api<Announcement | null>('/api/announcement'),
    async setAnnouncement(announcement) {
      await api<void>('/api/admin/announcement', {
        method: 'PUT',
        body: JSON.stringify(announcement),
      })
    },
  }
}
