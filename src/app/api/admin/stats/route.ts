import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { fetchProfiles, fetchQuestions, fetchRoomStats } from '@/server/adminData'
import type { AdminStats } from '@/services/types'

export async function GET() {
  return withAdmin(async () => {
    const [users, rooms, questions] = await Promise.all([
      fetchProfiles(),
      fetchRoomStats(),
      fetchQuestions(),
    ])
    const stats: AdminStats = {
      totalUsers: users.length,
      proUsers: users.filter((u) => u.plan === 'pro').length,
      adminUsers: users.filter((u) => u.role === 'admin').length,
      totalRooms: rooms.length,
      activeRooms: rooms.filter((r) => r.status === 'active').length,
      completedRooms: rooms.filter((r) => r.status === 'completed').length,
      totalFavorites: rooms.reduce((sum, r) => sum + r.favorites.length, 0),
      totalQuestions: questions.length,
    }
    return NextResponse.json(stats)
  })
}
