export type Pool = 'deck' | 'flag'

/** Kursor dua kolam kartu di satu room. */
export interface PoolCursors {
  deckLength: number
  reserveLength: number
  currentIndex: number
  flagIndex: number
  currentPool: Pool
  flagMode: boolean
}

export interface AdvanceOutcome {
  currentIndex: number
  flagIndex: number
  currentPool: Pool
  flagMode: boolean
  /** Total kartu yang sudah dimainkan — dasar kuota akun gratis. */
  played: number
  completed: boolean
  /** Mode flag menyala tapi reserve habis; sesi jatuh balik ke deck klasik. */
  flagExhausted: boolean
}

export interface CardPools {
  deck: string[]
  currentIndex: number
  flagReserve: string[]
  flagIndex: number
  currentPool: Pool
}

/** Kartu yang sedang tampil, dibaca dari kolam yang sedang aktif. */
export function currentCardId(room: CardPools): string | undefined {
  return room.currentPool === 'flag'
    ? room.flagReserve[room.flagIndex]
    : room.deck[room.currentIndex]
}

/** Jumlah kartu yang sudah dimainkan dari kedua kolam. */
export function playedCount(room: { currentIndex: number; flagIndex: number }): number {
  return room.currentIndex + room.flagIndex + 1
}

/** Bentuk minimal satu room untuk menghitung kartu yang sudah lewat. */
export interface PlayedCards {
  deck: string[]
  currentIndex: number
  flagReserve: string[]
  flagIndex: number
  currentPool: Pool
}

/**
 * Semua kartu yang pernah muncul di layar user, dikumpulkan dari room-room
 * lamanya. Dipakai buat mendahulukan kartu baru saat menyusun dek berikutnya,
 * supaya sesi kedua tidak mengulang sesi pertama.
 *
 * Kursor menunjuk kartu yang sedang tampil, jadi kartu itu ikut terhitung —
 * kolam yang sedang tidak aktif berhenti satu kartu lebih pendek karena
 * kursornya menunggu, belum menampilkan.
 */
export function seenQuestionIds(rooms: readonly PlayedCards[]): Set<string> {
  const seen = new Set<string>()
  for (const room of rooms) {
    const deckCount = room.currentIndex + (room.currentPool === 'deck' ? 1 : 0)
    const flagCount = room.flagIndex + (room.currentPool === 'flag' ? 1 : 0)
    for (const id of room.deck.slice(0, deckCount)) seen.add(id)
    for (const id of room.flagReserve.slice(0, flagCount)) seen.add(id)
  }
  return seen
}

/**
 * Konsumsi kartu sekarang lalu tentukan kolam kartu berikutnya.
 * Toggle mode flag baru berlaku di kartu berikutnya — menukar kartu yang
 * sedang tampil akan membuang suara yang sudah masuk.
 */
export function advancePools(state: PoolCursors): AdvanceOutcome {
  const currentIndex = state.currentPool === 'deck' ? state.currentIndex + 1 : state.currentIndex
  const flagIndex = state.currentPool === 'flag' ? state.flagIndex + 1 : state.flagIndex

  const wantFlag = state.flagMode && flagIndex < state.reserveLength
  const flagExhausted = state.flagMode && !wantFlag
  const currentPool: Pool = wantFlag ? 'flag' : 'deck'

  return {
    currentIndex,
    flagIndex,
    currentPool,
    flagMode: state.flagMode && !flagExhausted,
    played: currentIndex + flagIndex,
    completed: currentPool === 'deck' && currentIndex >= state.deckLength,
    flagExhausted,
  }
}
