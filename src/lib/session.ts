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
