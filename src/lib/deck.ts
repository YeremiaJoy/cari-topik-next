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

/**
 * Komposisi deck: filter kategori + mode, urut ringan → sedang → dalam
 * (acak di dalam tiap blok), bias lawan kepribadian ditaruh belakang.
 * Murni — dipakai di API route (server) dan di unit test.
 */
export function buildDeck(
  bank: Question[],
  setup: RoomSetup,
  shuffle: <T>(items: T[]) => T[] = defaultShuffle,
): Question[] {
  const wantGroup = setup.participantCount > 2
  const avoid = deprioritizedBias(setup)
  return DEPTH_ORDER.flatMap((depth) => {
    const pool = shuffle(
      bank.filter(
        (q) =>
          q.category === setup.category && q.depth === depth && Boolean(q.forGroup) === wantGroup,
      ),
    )
    if (!avoid) return pool
    return [...pool.filter((q) => q.bias !== avoid), ...pool.filter((q) => q.bias === avoid)]
  })
}
