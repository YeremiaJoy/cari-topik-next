import type { FlagVote, QuestionStat } from '../services/types'
import { seenQuestionIds, type PlayedCards } from './session'

/** Satu room, seperlunya untuk menghitung performa kartu. */
export interface RoomStatsSource extends PlayedCards {
  favorites: string[]
  flagVotes: Record<string, { p1: FlagVote; p2: FlagVote }>
}

export type { QuestionStat }

function blank(questionId: string): QuestionStat {
  return { questionId, played: 0, favorites: 0, red: 0, green: 0 }
}

/**
 * Rekap performa tiap kartu dari seluruh room. Murni, jadi bisa diuji tanpa
 * database dan dipakai baik oleh panel admin maupun statistik komunitas.
 *
 * `played` menghitung kemunculan di layar, bukan sekadar masuk dek — kartu
 * yang nangkring di ekor dek dan tidak pernah sampai giliran tidak dihitung.
 */
export function aggregateQuestionStats(rooms: readonly RoomStatsSource[]): QuestionStat[] {
  const byId = new Map<string, QuestionStat>()
  const take = (id: string) => {
    const existing = byId.get(id)
    if (existing) return existing
    const fresh = blank(id)
    byId.set(id, fresh)
    return fresh
  }

  for (const room of rooms) {
    for (const id of seenQuestionIds([room])) take(id).played += 1
    for (const id of room.favorites) take(id).favorites += 1
    for (const [id, votes] of Object.entries(room.flagVotes)) {
      const stat = take(id)
      for (const vote of [votes.p1, votes.p2]) {
        if (vote === 'red') stat.red += 1
        else stat.green += 1
      }
    }
  }

  return [...byId.values()]
}

/**
 * Porsi suara merah, 0–100, dibulatkan. Null kalau belum ada yang memilih —
 * memaksa pemanggil memutuskan sendiri apa yang tampil saat data kosong,
 * bukan diam-diam menampilkan 0%.
 */
export function redSharePercent(stat: Pick<QuestionStat, 'red' | 'green'>): number | null {
  const total = stat.red + stat.green
  if (total === 0) return null
  return Math.round((stat.red / total) * 100)
}

/** Di bawah sekian suara, sebaran apa pun masih kebetulan. */
export const DIVISIVE_MIN_VOTES = 6

/**
 * Kartu flag yang benar-benar membelah ruangan — persis tugasnya. Sebaran
 * yang berat sebelah artinya semua orang sepakat, dan kartu yang disepakati
 * semua orang itu kartu mati: tidak ada yang bisa diperdebatkan.
 */
export function isDivisive(stat: Pick<QuestionStat, 'red' | 'green'>): boolean {
  const total = stat.red + stat.green
  if (total < DIVISIVE_MIN_VOTES) return false
  const share = (stat.red / total) * 100
  return share >= 35 && share <= 65
}
