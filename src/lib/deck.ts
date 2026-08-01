import type { Bias, Personality, Question, RoomSetup } from '../services/types'

function defaultShuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function deprioritizedBias(setup: RoomSetup): Bias | null {
  if (setup.participantCount !== 2 || !setup.personalities) return null
  const [a, b] = setup.personalities as [Personality, Personality]
  if (a !== b) return null
  return a === 'introvert' ? 'extrovert' : 'introvert'
}

/** Satu kartu flag disisipkan setiap 4 kartu klasik. */
export const FLAG_CADENCE = 4

export interface BuiltDeck {
  deck: Question[]
  flagReserve: Question[]
}

/** Kartu flag hanya untuk pasangan dengan tepat 2 peserta. */
function allowsFlagCards(setup: RoomSetup): boolean {
  return setup.category === 'pasangan' && setup.participantCount === 2
}

/**
 * Kartu ringan yang selalu dibuka duluan sebelum sisanya diacak bebas.
 * Cukup buat mencairkan suasana, tapi nggak sampai bikin urutannya ketebak.
 */
export const WARMUP_CARDS = 2

/**
 * Komposisi deck: filter kategori + mode, dua kartu ringan sebagai pembuka,
 * lalu sisa kartu diacak bebas lintas kedalaman — jadi tiap sesi terasa beda
 * dan sesi pendek pun tetap kebagian pertanyaan sedang/dalam. Bias lawan
 * kepribadian ditaruh belakang.
 * Untuk room pasangan berdua, kartu flag disisipkan tiap FLAG_CADENCE kartu
 * dan sisanya jadi flagReserve untuk mode flag murni.
 * Murni — dipakai di API route (server) dan di unit test.
 */
export function buildDeck(
  bank: Question[],
  setup: RoomSetup,
  shuffle: <T>(items: T[]) => T[] = defaultShuffle,
  seen: ReadonlySet<string> = new Set(),
): BuiltDeck {
  const wantGroup = setup.participantCount > 2
  const avoid = deprioritizedBias(setup)

  const inScope = bank.filter(
    (q) =>
      q.type === 'question' &&
      q.category === setup.category &&
      Boolean(q.forGroup) === wantGroup,
  )

  // Bias lawan kepribadian ditaruh belakang.
  const demote = (pool: Question[]) =>
    avoid ? [...pool.filter((q) => q.bias !== avoid), ...pool.filter((q) => q.bias === avoid)] : pool

  /**
   * Kartu yang belum pernah dimainkan user didahulukan; yang sudah pernah
   * tetap ikut, cuma di belakang — jadi bank yang habis tidak bikin dek
   * kosong, sekadar mulai mengulang. Kesegaran menang atas bias: kartu baru
   * yang kurang cocok tetap lebih berharga daripada pengulangan.
   */
  const arrange = (pool: Question[]) => [
    ...demote(pool.filter((q) => !seen.has(q.id))),
    ...demote(pool.filter((q) => seen.has(q.id))),
  ]

  const ringan = arrange(shuffle(inScope.filter((q) => q.depth === 'ringan')))
  const warmup = ringan.slice(0, WARMUP_CARDS)
  const warmupIds = new Set(warmup.map((q) => q.id))
  const rest = arrange(shuffle(inScope.filter((q) => !warmupIds.has(q.id))))

  const classic = [...warmup, ...rest]

  if (!allowsFlagCards(setup)) return { deck: classic, flagReserve: [] }

  const flagPool = shuffle(bank.filter((q) => q.type === 'flag' && q.category === 'pasangan'))
  const inlineCount = Math.min(Math.floor(classic.length / FLAG_CADENCE), flagPool.length)
  const inline = flagPool.slice(0, inlineCount)

  const deck: Question[] = []
  let used = 0
  classic.forEach((q, i) => {
    deck.push(q)
    if ((i + 1) % FLAG_CADENCE === 0 && used < inline.length) deck.push(inline[used++])
  })

  return { deck, flagReserve: flagPool.slice(inlineCount) }
}
