import type { FlagVote } from '../services/types'
import { seenQuestionIds, type PlayedCards } from './session'

/** Satu room, seperlunya untuk menghitung performa kartu. */
export interface RoomStatsSource extends PlayedCards {
  favorites: string[]
  flagVotes: Record<string, { p1: FlagVote; p2: FlagVote }>
}

export interface QuestionStat {
  questionId: string
  /** Berapa kali kartu ini benar-benar tampil di layar. */
  played: number
  /** Berapa kali disimpan ke favorit. */
  favorites: number
  /** Suara komunitas — hanya terisi untuk kartu flag. */
  red: number
  green: number
}

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
