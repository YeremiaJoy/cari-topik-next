import type { Bias, Depth, Personality, Question, RoomSetup } from '../services/types'

const DEPTH_ORDER: Depth[] = ['ringan', 'sedang', 'dalam']

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
 * Komposisi deck: filter kategori + mode, urut ringan → sedang → dalam
 * (acak di dalam tiap blok), bias lawan kepribadian ditaruh belakang.
 * Untuk room pasangan berdua, kartu flag disisipkan tiap FLAG_CADENCE kartu
 * dan sisanya jadi flagReserve untuk mode flag murni.
 * Murni — dipakai di API route (server) dan di unit test.
 */
export function buildDeck(
  bank: Question[],
  setup: RoomSetup,
  shuffle: <T>(items: T[]) => T[] = defaultShuffle,
): BuiltDeck {
  const wantGroup = setup.participantCount > 2
  const avoid = deprioritizedBias(setup)
  const classic = DEPTH_ORDER.flatMap((depth) => {
    const pool = shuffle(
      bank.filter(
        (q) =>
          q.type === 'question' &&
          q.category === setup.category &&
          q.depth === depth &&
          Boolean(q.forGroup) === wantGroup,
      ),
    )
    if (!avoid) return pool
    return [...pool.filter((q) => q.bias !== avoid), ...pool.filter((q) => q.bias === avoid)]
  })

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
