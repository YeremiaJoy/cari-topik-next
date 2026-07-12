import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/handler'
import { fetchProfiles, fetchQuestions, fetchRoomStats } from '@/server/adminData'
import type { AdminAnalytics, Category, Depth, WeeklyCount } from '@/services/types'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const ANALYTICS_WEEKS = 12

/** Awal minggu (Senin, 00:00) dari sebuah timestamp. */
const weekStartOf = (time: number) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  const daysSinceMonday = (d.getDay() + 6) % 7
  return d.getTime() - daysSinceMonday * DAY_MS
}

/** Kelompokkan timestamp ke ember mingguan, urut lama → baru. */
const weeklyBuckets = (times: number[], weeks: number): WeeklyCount[] => {
  const currentWeek = weekStartOf(Date.now())
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(currentWeek - (weeks - 1 - i) * WEEK_MS).toISOString(),
    count: 0,
  }))
  for (const time of times) {
    const index = weeks - 1 - Math.round((currentWeek - weekStartOf(time)) / WEEK_MS)
    if (index >= 0 && index < weeks) buckets[index].count += 1
  }
  return buckets
}

export async function GET() {
  return withAdmin(async () => {
    const [users, rooms, bank] = await Promise.all([
      fetchProfiles(),
      fetchRoomStats(),
      fetchQuestions(),
    ])
    const categories: Category[] = ['pasangan', 'teman', 'keluarga']
    const depths: Depth[] = ['ringan', 'sedang', 'dalam']
    const analytics: AdminAnalytics = {
      signupsByWeek: weeklyBuckets(
        users.map((u) => new Date(u.created_at).getTime()),
        ANALYTICS_WEEKS,
      ),
      roomsByWeek: weeklyBuckets(
        rooms.map((r) => new Date(r.created_at).getTime()),
        ANALYTICS_WEEKS,
      ),
      planCounts: {
        free: users.filter((u) => u.plan === 'free').length,
        pro: users.filter((u) => u.plan === 'pro').length,
      },
      roomsByCategory: categories.map((category) => ({
        category,
        count: rooms.filter((r) => r.category === category).length,
      })),
      roomStatus: {
        active: rooms.filter((r) => r.status === 'active').length,
        completed: rooms.filter((r) => r.status === 'completed').length,
      },
      questionsByCategory: categories.map((category) => ({
        category,
        counts: Object.fromEntries(
          depths.map((d) => [
            d,
            bank.filter((q) => q.category === category && q.depth === d).length,
          ]),
        ) as Record<Depth, number>,
      })),
    }
    return NextResponse.json(analytics)
  })
}
