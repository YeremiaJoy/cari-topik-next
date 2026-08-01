# Red Flag vs Green Flag Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second card type to CariTopik where both partners vote RED or GREEN on one phone, then the card reveals both answers and whether they matched.

**Architecture:** Flag cards live in the existing `questions` table behind a new `type` column, so the deck stays a `uuid[]` and the client keeps one question cache. Rooms gain a reserve pool of flag cards plus a second cursor, letting a Pro-only in-session toggle switch the room to pure-flag mode without rebuilding the deck. All branching logic (deck composition, cursor advance) lives in pure functions under `src/lib/` so it is unit-testable.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM on Neon Postgres, Tailwind v4, motion, i18next, Vitest.

## Global Constraints

- **Source spec:** `docs/superpowers/specs/2026-08-01-red-green-flag-mode-design.md`. Read it before starting.
- **No emoji in any new UI.** Flag marks are `Glyph` SVGs. Existing 🃏 / ⏱️ / ❤️ on the summary screen stay untouched.
- **Flag cards appear only in `pasangan` rooms with `participantCount === 2`.** Never teman, keluarga, or group (3+).
- **Two options only.** No yellow flag.
- **Vitest has no database harness.** Every test in this plan targets a pure function. Never write a test that needs a live Postgres connection.
- **Comments and user-facing copy are Indonesian**, matching the existing codebase. Code identifiers are English.
- **Verification commands:** `yarn test` (vitest run) and `yarn typecheck` (tsc --noEmit). Both must pass before every commit.
- **Colour tokens** (exact values): `--color-flag-red: #c0392b`, `--color-flag-red-soft: #fbe3df`, `--color-flag-green: #2f8f6b`, `--color-flag-green-soft: #dcf0e7`, `--color-flag-red-on-dark: #ff8a72`, `--color-flag-green-on-dark: #5fd6a8`.
- **Cadence constant:** one flag card after every 4 classic cards, so merged indices 4, 9, 14, …

---

## File Structure

**Create:**
- `src/lib/session.ts` — pure cursor logic: `advancePools`, `currentCardId`
- `src/lib/session.test.ts` — tests for the above
- `src/server/mappers.test.ts` — tests for `toQuestion` / `toRoom` field mapping
- `src/components/FlagCard.tsx` — the vote → reveal card
- `src/app/api/rooms/[id]/flag-mode/route.ts` — PATCH toggle
- `src/app/api/rooms/[id]/flag-votes/[questionId]/route.ts` — PUT votes

**Modify:**
- `src/server/db/schema.ts` — `question_type` enum + `questions.type`; `room_pool` enum + 5 room columns
- `src/services/types.ts` — `QuestionType`, `FlagVote`, `Question.type`, `Room` fields, `PaywallReason`, `RoomService` methods; delete `QuestionService.buildDeck`
- `src/server/mappers.ts` — `QuestionRow.type`, `RoomRow` fields, both mappers
- `src/lib/deck.ts` — `buildDeck` returns `{ deck, flagReserve }`
- `src/lib/deck.test.ts` — updated for the new return shape, plus flag cases
- `src/server/db/operations.ts` — selects, `createRoomForUser`, `advanceRoomCard`, new `setRoomFlagMode` / `setFlagVotes`
- `src/services/index.ts` — delete dead `questionService.buildDeck`
- `src/services/http/client.ts` — map `paywall:flagMode`
- `src/services/http/roomService.ts` — `setFlagMode`, `saveFlagVotes`
- `src/components/Glyph.tsx` — `flagRed`, `flagGreen`
- `src/app/globals.css` — flag colour tokens
- `src/components/PaywallModal.tsx` — accept `flagMode` reason
- `src/views/SessionPage.tsx` — `currentCardId`, FlagCard rendering, toggle, recap
- `src/i18n/locales/id.ts`, `src/i18n/locales/en.ts` — `flag.*` + `paywall.flagMode.*`
- `src/views/admin/AdminQuestionsPage.tsx` — type filter + form field
- `src/app/api/admin/questions/route.ts`, `[id]/route.ts` — validate type
- `drizzle/seed/questions.sql` — 60 flag scenarios

---

### Task 1: Question type column, end to end

Adds `questions.type` and threads it to the client. No behaviour change yet — after this task the app runs exactly as before, but every `Question` carries a type.

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/services/types.ts`
- Modify: `src/server/mappers.ts:43-52` (`QuestionRow`), `:110-119` (`toQuestion`)
- Modify: `src/server/db/operations.ts:183-199` (`getQuestionRows`)
- Test: `src/server/mappers.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `type QuestionType = 'question' | 'flag'`; `Question.type: QuestionType` (required); `QuestionRow.type: QuestionType`.

- [ ] **Step 1: Write the failing test**

Create `src/server/mappers.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { toQuestion } from './mappers'
import type { QuestionRow } from './mappers'

const row: QuestionRow = {
  id: 'q1',
  question_code: 'q-001',
  text_id: 'teks id',
  text_en: 'text en',
  category: 'pasangan',
  depth: 'ringan',
  bias: 'netral',
  for_group: false,
  type: 'question',
}

describe('toQuestion', () => {
  test('meneruskan type dari row', () => {
    expect(toQuestion(row).type).toBe('question')
    expect(toQuestion({ ...row, type: 'flag' }).type).toBe('flag')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/server/mappers.test.ts`
Expected: FAIL — TypeScript rejects `type` on `QuestionRow`, or the assertion gets `undefined`.

- [ ] **Step 3: Add the enum and column to the schema**

In `src/server/db/schema.ts`, next to the other enums (after `questionBiasEnum`):

```ts
export const questionTypeEnum = pgEnum("question_type", ["question", "flag"]);
```

In the `questions` table definition, after the `bias` column:

```ts
  type: questionTypeEnum("type").notNull().default("question"),
```

- [ ] **Step 4: Add the types**

In `src/services/types.ts`, next to the other unions near the top:

```ts
export type QuestionType = 'question' | 'flag'
export type FlagVote = 'red' | 'green'
```

In the `Question` interface, after `bias`:

```ts
  /** 'flag' = kartu skenario Red vs Green (khusus pasangan, 2 peserta). */
  type: QuestionType
```

- [ ] **Step 5: Thread it through the mapper**

In `src/server/mappers.ts`, add to `QuestionRow` after `for_group`:

```ts
  type: QuestionType
```

Add `QuestionType` to the type import block at the top of the file. Then in `toQuestion`, after `forGroup`:

```ts
    type: row.type,
```

- [ ] **Step 6: Select the column**

In `src/server/db/operations.ts`, inside `getQuestionRows`, add to the select object after `for_group: questions.for_group,`:

```ts
      type: questions.type,
```

- [ ] **Step 7: Run tests and typecheck**

Run: `yarn test && yarn typecheck`
Expected: mappers test PASSES. `yarn typecheck` will FAIL in `src/lib/deck.test.ts` because the `q()` helper does not set `type`. Fix it now — in `src/lib/deck.test.ts`, add a parameter and field to the helper:

```ts
const q = (
  id: string,
  depth: Question['depth'],
  bias: Question['bias'],
  forGroup = false,
  category: Question['category'] = 'pasangan',
  type: Question['type'] = 'question',
): Question => ({
  id,
  text: { id: `t-${id}`, en: `t-${id}` },
  category,
  depth,
  bias,
  forGroup: forGroup || undefined,
  type,
})
```

Re-run: `yarn test && yarn typecheck`. Expected: both PASS.

- [ ] **Step 8: Generate the migration**

Run: `yarn db:generate`
Expected: a new file appears in `drizzle/` (drizzle-kit picks the name) containing `CREATE TYPE "public"."question_type"` and `ALTER TABLE "questions" ADD COLUMN "type"`. Open it and confirm both statements are present and that no other table is touched.

- [ ] **Step 9: Commit**

```bash
git add src/server/db/schema.ts src/services/types.ts src/server/mappers.ts \
        src/server/mappers.test.ts src/server/db/operations.ts src/lib/deck.test.ts drizzle/
git commit -m "feat: add type column to questions for flag cards"
```

---

### Task 2: buildDeck returns a deck and a flag reserve

**Files:**
- Modify: `src/lib/deck.ts`
- Modify: `src/lib/deck.test.ts`
- Modify: `src/server/db/operations.ts:527`
- Modify: `src/services/index.ts:14-20`
- Modify: `src/services/types.ts:192-195`

**Interfaces:**
- Consumes: `Question.type` from Task 1.
- Produces: `buildDeck(bank, setup, shuffle?): { deck: Question[]; flagReserve: Question[] }`, and the exported constant `FLAG_CADENCE = 4`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/deck.test.ts`, replace the existing `describe('buildDeck', ...)` block with this. Note every existing assertion now reads `.deck`:

```ts
const FLAGS: Question[] = [
  q('f1', 'ringan', 'netral', false, 'pasangan', 'flag'),
  q('f2', 'ringan', 'netral', false, 'pasangan', 'flag'),
]

/** 8 kartu klasik → dua slot inline (indeks gabungan 4 dan 9). */
const BIG_BANK: Question[] = [
  ...Array.from({ length: 8 }, (_, i) => q(`c${i}`, 'ringan', 'netral')),
  ...FLAGS,
]

describe('buildDeck', () => {
  test('filter kategori + mode, urut ringan → sedang → dalam', () => {
    const { deck } = buildDeck(BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
  })

  test('mode grup hanya kartu forGroup', () => {
    const { deck } = buildDeck(BANK, { participantCount: 3, category: 'pasangan' }, identity)
    expect(deck.map((x) => x.id)).toEqual(['g1'])
  })

  test('dua introvert → bias extrovert ke belakang tiap blok', () => {
    const { deck } = buildDeck(BANK, pairSetup(['introvert', 'introvert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
    const twoExtro = buildDeck(BANK, pairSetup(['extrovert', 'extrovert']), identity)
    expect(twoExtro.deck.map((x) => x.id)).toEqual(['r2', 'r1', 's1', 'd1'])
  })

  test('kepribadian beda → tanpa deprioritas', () => {
    const { deck } = buildDeck(BANK, pairSetup(['introvert', 'extrovert']), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
  })

  test('kartu flag disisipkan tiap 4 kartu klasik, tidak pernah di indeks 0', () => {
    const { deck } = buildDeck(BIG_BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual([
      'c0', 'c1', 'c2', 'c3', 'f1',
      'c4', 'c5', 'c6', 'c7', 'f2',
    ])
    expect(deck[0].type).toBe('question')
  })

  test('sisa kartu flag masuk ke flagReserve', () => {
    const bank = [...BIG_BANK, q('f3', 'ringan', 'netral', false, 'pasangan', 'flag')]
    const { deck, flagReserve } = buildDeck(bank, pairSetup(), identity)
    expect(deck.filter((x) => x.type === 'flag').map((x) => x.id)).toEqual(['f1', 'f2'])
    expect(flagReserve.map((x) => x.id)).toEqual(['f3'])
  })

  test('inline dibatasi jumlah kartu flag yang tersedia', () => {
    const bank = [...Array.from({ length: 8 }, (_, i) => q(`c${i}`, 'ringan', 'netral')), FLAGS[0]]
    const { deck, flagReserve } = buildDeck(bank, pairSetup(), identity)
    expect(deck.filter((x) => x.type === 'flag')).toHaveLength(1)
    expect(flagReserve).toEqual([])
  })

  test('mode grup tidak dapat kartu flag', () => {
    const bank = [...BIG_BANK, q('g2', 'ringan', 'netral', true)]
    const { deck, flagReserve } = buildDeck(bank, { participantCount: 3, category: 'pasangan' }, identity)
    expect(deck.every((x) => x.type === 'question')).toBe(true)
    expect(flagReserve).toEqual([])
  })

  test('kategori teman tidak dapat kartu flag', () => {
    const bank = [
      ...Array.from({ length: 8 }, (_, i) => q(`t${i}`, 'ringan', 'netral', false, 'teman')),
      ...FLAGS,
    ]
    const { deck, flagReserve } = buildDeck(bank, { participantCount: 2, category: 'teman' }, identity)
    expect(deck.every((x) => x.type === 'question')).toBe(true)
    expect(flagReserve).toEqual([])
  })

  test('bank tanpa kartu flag → perilaku lama persis', () => {
    const { deck, flagReserve } = buildDeck(BANK, pairSetup(), identity)
    expect(deck.map((x) => x.id)).toEqual(['r1', 'r2', 's1', 'd1'])
    expect(flagReserve).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/lib/deck.test.ts`
Expected: FAIL — `buildDeck` returns an array, so destructuring `{ deck }` yields `undefined`.

- [ ] **Step 3: Implement the new buildDeck**

Replace the `buildDeck` function in `src/lib/deck.ts` (keep `DEPTH_ORDER`, `defaultShuffle`, and `deprioritizedBias` as they are):

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/lib/deck.test.ts`
Expected: PASS, all 10 tests.

- [ ] **Step 5: Update the server caller**

In `src/server/db/operations.ts`, replace line 527:

```ts
      const deck = buildDeck(bank, setup).map((q) => q.id)
```

with:

```ts
      const built = buildDeck(bank, setup)
      const deck = built.deck.map((q) => q.id)
      const flagReserve = built.flagReserve.map((q) => q.id)
```

Leave the `if (deck.length === 0)` guard directly below it unchanged. `flagReserve` is persisted in Task 4 — it is unused for now, so add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above it **only if** `yarn typecheck` complains; `tsc --noEmit` with this project's config does not flag unused locals, so most likely nothing is needed.

- [ ] **Step 6: Delete the dead client buildDeck**

In `src/services/index.ts`, remove the `buildDeck` import on line 7 and the `buildDeck` property on line 17, leaving:

```ts
/** getById sinkron dari cache; deck room dikomposisi server (POST /api/rooms). */
function createClientQuestionService(): QuestionService {
  return {
    getById: (id) => questionCache.list().find((q) => q.id === id),
  }
}
```

In `src/services/types.ts`, delete the `buildDeck` line from `QuestionService`, leaving:

```ts
export interface QuestionService {
  getById(id: string): Question | undefined
}
```

- [ ] **Step 7: Run the full suite**

Run: `yarn test && yarn typecheck`
Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/deck.ts src/lib/deck.test.ts src/server/db/operations.ts \
        src/services/index.ts src/services/types.ts
git commit -m "feat: buildDeck returns deck plus flag reserve"
```

---

### Task 3: Pure cursor logic

The two-pool advance rule, extracted so it can be tested without a database.

**Files:**
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Pool = 'deck' | 'flag'`
  - `interface PoolCursors { deckLength, reserveLength, currentIndex, flagIndex, currentPool, flagMode }`
  - `interface AdvanceOutcome { currentIndex, flagIndex, currentPool, flagMode, played, completed, flagExhausted }`
  - `advancePools(state: PoolCursors): AdvanceOutcome`
  - `currentCardId(room: CardPools): string | undefined`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/session.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { advancePools, currentCardId } from './session'
import type { PoolCursors } from './session'

const base: PoolCursors = {
  deckLength: 5,
  reserveLength: 3,
  currentIndex: 0,
  flagIndex: 0,
  currentPool: 'deck',
  flagMode: false,
}

describe('currentCardId', () => {
  const room = {
    deck: ['d0', 'd1'],
    currentIndex: 1,
    flagReserve: ['f0', 'f1'],
    flagIndex: 0,
    currentPool: 'deck' as const,
  }

  test('ambil dari deck saat pool deck', () => {
    expect(currentCardId(room)).toBe('d1')
  })

  test('ambil dari reserve saat pool flag', () => {
    expect(currentCardId({ ...room, currentPool: 'flag', flagIndex: 1 })).toBe('f1')
  })

  test('undefined saat kursor lewat ujung', () => {
    expect(currentCardId({ ...room, currentIndex: 9 })).toBeUndefined()
  })
})

describe('advancePools', () => {
  test('maju di deck saat mode flag mati', () => {
    const out = advancePools(base)
    expect(out.currentIndex).toBe(1)
    expect(out.flagIndex).toBe(0)
    expect(out.currentPool).toBe('deck')
    expect(out.played).toBe(1)
    expect(out.completed).toBe(false)
  })

  test('mode flag aktif → kartu berikutnya dari reserve', () => {
    const out = advancePools({ ...base, flagMode: true })
    expect(out.currentPool).toBe('flag')
    expect(out.currentIndex).toBe(1)
    expect(out.flagIndex).toBe(0)
  })

  test('maju di reserve hanya menggeser flagIndex', () => {
    const out = advancePools({ ...base, currentPool: 'flag', flagMode: true, currentIndex: 2 })
    expect(out.flagIndex).toBe(1)
    expect(out.currentIndex).toBe(2)
    expect(out.currentPool).toBe('flag')
  })

  test('played menjumlahkan kedua kursor', () => {
    const out = advancePools({ ...base, currentIndex: 2, flagIndex: 1, currentPool: 'flag', flagMode: true })
    expect(out.played).toBe(4)
  })

  test('matikan mode flag → kembali ke deck di kartu berikutnya', () => {
    const out = advancePools({ ...base, currentPool: 'flag', flagIndex: 1, flagMode: false })
    expect(out.currentPool).toBe('deck')
    expect(out.flagIndex).toBe(2)
    expect(out.currentIndex).toBe(0)
  })

  test('reserve habis → fallback ke deck dan flagMode dimatikan', () => {
    const out = advancePools({
      ...base,
      currentPool: 'flag',
      flagIndex: 2,
      reserveLength: 3,
      flagMode: true,
    })
    expect(out.flagIndex).toBe(3)
    expect(out.flagExhausted).toBe(true)
    expect(out.flagMode).toBe(false)
    expect(out.currentPool).toBe('deck')
  })

  test('selesai saat deck habis', () => {
    const out = advancePools({ ...base, currentIndex: 4 })
    expect(out.completed).toBe(true)
  })

  test('belum selesai selama masih ada kartu flag di mode flag', () => {
    const out = advancePools({ ...base, currentIndex: 4, flagMode: true })
    expect(out.currentPool).toBe('flag')
    expect(out.completed).toBe(false)
  })

  test('reserve tersisa tapi mode flag mati → deck habis tetap selesai', () => {
    const out = advancePools({ ...base, currentIndex: 4, flagMode: false, reserveLength: 3 })
    expect(out.completed).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/lib/session.test.ts`
Expected: FAIL — cannot resolve `./session`.

- [ ] **Step 3: Implement the module**

Create `src/lib/session.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/lib/session.test.ts && yarn typecheck`
Expected: both PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/session.test.ts
git commit -m "feat: add pure two-pool cursor logic for flag mode"
```

---

### Task 4: Room columns and the new advance

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/services/types.ts` (`Room`)
- Modify: `src/server/mappers.ts:27-41` (`RoomRow`), `:91-108` (`toRoom`)
- Modify: `src/server/db/operations.ts:201-222`, `:470-493`, `:532-542`, `:555-619`
- Test: `src/server/mappers.test.ts`

**Interfaces:**
- Consumes: `advancePools` from Task 3; `flagReserve` local from Task 2.
- Produces: `Room.flagMode / flagReserve / flagIndex / currentPool / flagVotes` on the client; `RoomRow.flag_mode / flag_reserve / flag_index / current_pool / flag_votes` on the server.

- [ ] **Step 1: Write the failing test**

Append to `src/server/mappers.test.ts`:

```ts
import { toRoom } from './mappers'
import type { RoomRow } from './mappers'

const roomRow: RoomRow = {
  id: 'r1',
  user_id: 'u1',
  participant_count: 2,
  category: 'pasangan',
  personalities: null,
  deck: ['d0', 'd1'],
  current_index: 0,
  favorites: [],
  status: 'active',
  window_start: 0,
  exhausted_at: null,
  created_at: '2026-08-01T00:00:00.000Z',
  ended_at: null,
  flag_mode: true,
  flag_reserve: ['f0'],
  flag_index: 0,
  current_pool: 'flag',
  flag_votes: { f0: { p1: 'red', p2: 'green' } },
}

describe('toRoom', () => {
  test('memetakan kolom flag ke camelCase', () => {
    const room = toRoom(roomRow)
    expect(room.flagMode).toBe(true)
    expect(room.flagReserve).toEqual(['f0'])
    expect(room.flagIndex).toBe(0)
    expect(room.currentPool).toBe('flag')
    expect(room.flagVotes).toEqual({ f0: { p1: 'red', p2: 'green' } })
  })
})
```

Merge the two `import ... from './mappers'` lines into one.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/server/mappers.test.ts`
Expected: FAIL — `RoomRow` has no `flag_mode`.

- [ ] **Step 3: Add the schema columns**

In `src/server/db/schema.ts`, add the enum next to the others:

```ts
export const roomPoolEnum = pgEnum("room_pool", ["deck", "flag"]);
```

Add to the `rooms` table after `favorites`:

```ts
    flag_mode: boolean("flag_mode").notNull().default(false),
    flag_reserve: uuid("flag_reserve")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    flag_index: integer("flag_index").notNull().default(0),
    current_pool: roomPoolEnum("current_pool").notNull().default("deck"),
    flag_votes: jsonb("flag_votes")
      .$type<Record<string, { p1: FlagVote; p2: FlagVote }>>()
      .notNull()
      .default({}),
```

Add `FlagVote` to the existing type import at the top: `import type { FlagVote, Personality } from "@/services/types";`

- [ ] **Step 4: Extend the Room type**

In `src/services/types.ts`, add to the `Room` interface after `exhaustedAt`:

```ts
  /** Mode flag murni sedang aktif; berlaku mulai kartu berikutnya. */
  flagMode: boolean
  /** Kartu flag cadangan untuk mode flag murni, di luar `deck`. */
  flagReserve: string[]
  flagIndex: number
  currentPool: 'deck' | 'flag'
  flagVotes: Record<string, { p1: FlagVote; p2: FlagVote }>
```

- [ ] **Step 5: Extend RoomRow and toRoom**

In `src/server/mappers.ts`, add to `RoomRow` after `ended_at`:

```ts
  flag_mode: boolean
  flag_reserve: string[]
  flag_index: number
  current_pool: 'deck' | 'flag'
  flag_votes: Record<string, { p1: FlagVote; p2: FlagVote }>
```

Add `FlagVote` to the type import block. Then in `toRoom`, after `exhaustedAt`:

```ts
    flagMode: row.flag_mode,
    flagReserve: row.flag_reserve,
    flagIndex: row.flag_index,
    currentPool: row.current_pool,
    flagVotes: row.flag_votes,
```

- [ ] **Step 6: Select the new columns**

In `src/server/db/operations.ts`, add these five lines to the select object in **both** `getRoomRow` (after `ended_at: rooms.ended_at,` around line 216) and `listRoomsForUser` (after `ended_at: rooms.ended_at,` around line 486):

```ts
      flag_mode: rooms.flag_mode,
      flag_reserve: rooms.flag_reserve,
      flag_index: rooms.flag_index,
      current_pool: rooms.current_pool,
      flag_votes: rooms.flag_votes,
```

- [ ] **Step 7: Persist the reserve at room creation**

In `createRoomForUser`, add to the `.values({...})` object after `deck,`:

```ts
          flag_reserve: flagReserve,
```

- [ ] **Step 8: Rewrite advanceRoomCard**

Replace the body of `advanceRoomCard` from `const nextIndex = room.current_index + 1` through the end of the transaction callback with:

```ts
      const outcome = advancePools({
        deckLength: room.deck.length,
        reserveLength: room.flag_reserve.length,
        currentIndex: room.current_index,
        flagIndex: room.flag_index,
        currentPool: room.current_pool,
        flagMode: room.flag_mode,
      })
      const now = new Date()
      const nowIso = now.toISOString()

      if (outcome.completed) {
        await tx
          .update(rooms)
          .set({ status: 'completed', ended_at: nowIso })
          .where(eq(rooms.id, roomId))
        const updated = await getRoomRow(tx, user.id, roomId)
        if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
        return updated
      }

      const cursors = {
        current_index: outcome.currentIndex,
        flag_index: outcome.flagIndex,
        current_pool: outcome.currentPool,
        flag_mode: outcome.flagMode,
      }

      if (user.plan !== 'free') {
        await tx.update(rooms).set(cursors).where(eq(rooms.id, roomId))
        const updated = await getRoomRow(tx, user.id, roomId)
        if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
        return updated
      }

      const cfg = await getConfigFromClient(tx)
      let windowStart = room.window_start ?? 0
      let exhaustedAt = room.exhausted_at

      // Kuota menghitung kartu dari kedua kolam, bukan indeks deck saja.
      if (outcome.played - windowStart >= cfg.freeMaxQuestions) {
        const resetAt = exhaustedAt
          ? new Date(new Date(exhaustedAt).getTime() + QUESTION_RESET_MS)
          : now
        if (now.getTime() < resetAt.getTime()) {
          throw new HttpError(402, 'paywall:questions', 'Kuota kartu habis.', resetAt.toISOString())
        }
        windowStart = outcome.played
        exhaustedAt = null
      }

      if (outcome.played - windowStart === cfg.freeMaxQuestions - 1) {
        exhaustedAt = nowIso
      }

      await tx
        .update(rooms)
        .set({ ...cursors, window_start: windowStart, exhausted_at: exhaustedAt })
        .where(eq(rooms.id, roomId))
      const updated = await getRoomRow(tx, user.id, roomId)
      if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
      return updated
```

Add the import at the top of the file:

```ts
import { advancePools } from '@/lib/session'
```

- [ ] **Step 9: Run tests and typecheck**

Run: `yarn test && yarn typecheck`
Expected: both PASS.

- [ ] **Step 10: Generate the migration**

Run: `yarn db:generate`
Expected: a new file in `drizzle/` with `CREATE TYPE "public"."room_pool"` and five `ALTER TABLE "rooms" ADD COLUMN` statements. Confirm every added column has a `DEFAULT`, so existing rows migrate without a backfill.

- [ ] **Step 11: Commit**

```bash
git add src/server/db/schema.ts src/services/types.ts src/server/mappers.ts \
        src/server/mappers.test.ts src/server/db/operations.ts drizzle/
git commit -m "feat: two-pool room cursors with quota counting both pools"
```

---

### Task 5: Flag-mode and vote endpoints

**Files:**
- Create: `src/app/api/rooms/[id]/flag-mode/route.ts`
- Create: `src/app/api/rooms/[id]/flag-votes/[questionId]/route.ts`
- Modify: `src/server/db/operations.ts`
- Modify: `src/services/http/client.ts:36-38`
- Modify: `src/services/http/roomService.ts`
- Modify: `src/services/types.ts` (`PaywallReason`, `RoomService`)

**Interfaces:**
- Consumes: `RoomRow` fields from Task 4.
- Produces: `setRoomFlagMode(user: User, roomId: string, enabled: boolean): Promise<RoomRow>`; `setFlagVotes(userId: string, roomId: string, questionId: string, votes: { p1: FlagVote; p2: FlagVote }): Promise<RoomRow>`; `roomService.setFlagMode(roomId, enabled)`; `roomService.saveFlagVotes(roomId, questionId, votes)`.

- [ ] **Step 1: Add the paywall reason**

In `src/services/types.ts`:

```ts
export type PaywallReason = 'participants' | 'questions' | 'rooms' | 'flagMode'
```

Add to the `RoomService` interface:

```ts
  /** Nyalakan/matikan mode flag murni; berlaku mulai kartu berikutnya. */
  setFlagMode(roomId: string, enabled: boolean): Promise<Room>
  saveFlagVotes(
    roomId: string,
    questionId: string,
    votes: { p1: FlagVote; p2: FlagVote },
  ): Promise<Room>
```

- [ ] **Step 2: Map the new paywall code on the client**

In `src/services/http/client.ts`, after the `paywall:questions` line:

```ts
  if (code === 'paywall:flagMode') throw new PaywallError('flagMode')
```

- [ ] **Step 3: Add the server operations**

Append to `src/server/db/operations.ts`:

```ts
export async function setRoomFlagMode(
  user: User,
  roomId: string,
  enabled: boolean,
): Promise<RoomRow> {
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  if (user.plan === 'free') {
    throw new HttpError(402, 'paywall:flagMode', 'Mode flag khusus akun Pro.')
  }
  return await getDb().transaction(async (tx) => {
    const row = await getRoomRow(tx, user.id, roomId)
    if (!row) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
    if (row.category !== 'pasangan' || row.participant_count !== 2) {
      throw new HttpError(400, 'validation_error', 'Mode flag hanya untuk pasangan berdua.')
    }
    if (enabled && row.flag_index >= row.flag_reserve.length) {
      throw new HttpError(400, 'validation_error', 'Kartu flag sudah habis di room ini.')
    }
    await tx.update(rooms).set({ flag_mode: enabled }).where(eq(rooms.id, roomId))
    const updated = await getRoomRow(tx, user.id, roomId)
    if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
    return updated
  })
}

export async function setFlagVotes(
  userId: string,
  roomId: string,
  questionId: string,
  votes: { p1: FlagVote; p2: FlagVote },
): Promise<RoomRow> {
  requireUuid(userId)
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  requireUuid(questionId, 'validation_error', 'Kartu tidak dikenal.')
  return await getDb().transaction(async (tx) => {
    const row = await getRoomRow(tx, userId, roomId)
    if (!row) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')

    const [question] = await tx
      .select({ type: questions.type })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1)
    if (!question || question.type !== 'flag') {
      throw new HttpError(400, 'validation_error', 'Kartu ini bukan kartu flag.')
    }

    await tx
      .update(rooms)
      .set({ flag_votes: { ...row.flag_votes, [questionId]: votes } })
      .where(eq(rooms.id, roomId))
    const updated = await getRoomRow(tx, userId, roomId)
    if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
    return updated
  })
}
```

Add `FlagVote` to the type imports at the top of the file if it is not already there.

- [ ] **Step 4: Create the flag-mode route**

Create `src/app/api/rooms/[id]/flag-mode/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { setRoomFlagMode } from '@/server/db/operations'

/** Nyalakan/matikan mode flag murni. Khusus akun Pro & room pasangan berdua. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (typeof body?.enabled !== 'boolean') {
      return jsonError(400, 'validation_error', 'Field enabled wajib boolean.')
    }
    return NextResponse.json(toRoom(await setRoomFlagMode(user, id, body.enabled)))
  })
}
```

- [ ] **Step 5: Create the flag-votes route**

Create `src/app/api/rooms/[id]/flag-votes/[questionId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toRoom } from '@/server/mappers'
import { setFlagVotes } from '@/server/db/operations'
import type { FlagVote } from '@/services/types'

const VOTES: FlagVote[] = ['red', 'green']

/** Simpan sepasang suara sekaligus — klien mengirim setelah tap kedua. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const { id, questionId } = await params
    const body = await request.json().catch(() => null)
    if (!VOTES.includes(body?.p1) || !VOTES.includes(body?.p2)) {
      return jsonError(400, 'validation_error', 'Suara harus red atau green.')
    }
    const room = await setFlagVotes(user.id, id, questionId, { p1: body.p1, p2: body.p2 })
    return NextResponse.json(toRoom(room))
  })
}
```

- [ ] **Step 6: Add the client methods**

In `src/services/http/roomService.ts`, add inside the returned object, after `endSession`:

```ts
    async setFlagMode(roomId, enabled) {
      return api<Room>(`/api/rooms/${roomId}/flag-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
    },
    async saveFlagVotes(roomId, questionId, votes) {
      return api<Room>(`/api/rooms/${roomId}/flag-votes/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(votes),
      })
    },
```

- [ ] **Step 7: Run tests and typecheck**

Run: `yarn test && yarn typecheck`
Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/rooms src/server/db/operations.ts src/services
git commit -m "feat: flag-mode toggle and vote persistence endpoints"
```

---

### Task 6: Flag glyphs and colour tokens

**Files:**
- Modify: `src/components/Glyph.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `GlyphName` gains `'flagRed' | 'flagGreen'`; CSS custom properties listed in Global Constraints.

- [ ] **Step 1: Add the colour tokens**

In `src/app/globals.css`, inside the same `@theme` block as the other `--color-*` declarations, after the butter colours:

```css
  /* Red vs Green flag mode. Nada hangat supaya menyatu dengan palet cream. */
  --color-flag-red: #c0392b;
  --color-flag-red-soft: #fbe3df;
  --color-flag-green: #2f8f6b;
  --color-flag-green-soft: #dcf0e7;
  /* Varian untuk mark di atas pita cocoa-900. */
  --color-flag-red-on-dark: #ff8a72;
  --color-flag-green-on-dark: #5fd6a8;
```

- [ ] **Step 2: Add the glyphs**

In `src/components/Glyph.tsx`, extend the union:

```ts
export type GlyphName =
  | 'couple'
  | 'friends'
  | 'family'
  | 'pair'
  | 'group'
  | 'introvert'
  | 'extrovert'
  | 'flagRed'
  | 'flagGreen'
```

Add these two cases to the switch. They are duotone rather than the line style used by the others — deliberate, so the mode reads as different, and so the pair stays legible at the 14px header chip:

```tsx
    case 'flagRed':
      return (
        <svg {...base} className={cn}>
          <path d="M6.6 3.2v17.6" strokeWidth="2.2" />
          <path d="M7.4 4.4h10.4l-3 3.7 3 3.7H7.4z" fill="currentColor" stroke="none" />
          <path d="M10.6 5.9c1.5.9 2.6.9 4.1 0" stroke="var(--color-cream-50)" strokeWidth="1.4" opacity="0.55" />
        </svg>
      )
    case 'flagGreen':
      return (
        <svg {...base} className={cn}>
          <path d="M6.6 3.2v17.6" strokeWidth="2.2" />
          <path d="M7.4 4.4h7.9c2.5 0 3.8 1.4 3.8 3.7s-1.3 3.7-3.8 3.7H7.4z" fill="currentColor" stroke="none" />
          <path d="M10.6 6c1.5.9 2.6.9 4.1 0" stroke="var(--color-cream-50)" strokeWidth="1.4" opacity="0.55" />
        </svg>
      )
```

The red pennant has a notched trailing edge and the green a rounded one, so the two are distinguishable with colour removed — red/green is the worst pair for deuteranopia, and a desaturated screenshot must still read.

- [ ] **Step 3: Verify**

Run: `yarn typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Glyph.tsx src/app/globals.css
git commit -m "feat: add flag pennant glyphs and colour tokens"
```

---

### Task 7: Translation keys

Landed as its own task so the i18n parity test gates it before any component depends on a missing key.

**Files:**
- Modify: `src/i18n/locales/id.ts`
- Modify: `src/i18n/locales/en.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `flag.*` and `paywall.flagMode.*` keys used by Tasks 8–10.

- [ ] **Step 1: Add the Indonesian keys**

In `src/i18n/locales/id.ts`, after the `card.*` block:

```ts
  'flag.toggle': 'Mode Flag',
  'flag.toggleHint': 'Semua kartu jadi skenario Red vs Green',
  'flag.proBadge': 'PRO',
  'flag.on': 'Kartu berikutnya jadi mode flag.',
  'flag.off': 'Kembali ke pertanyaan biasa.',
  'flag.exhausted': 'Kartu flag habis. Lanjut ke pertanyaan biasa.',
  'flag.scenarioN': 'Skenario {{n}}',
  'flag.label': 'Red vs Green',
  'flag.partner1': 'Pasangan 1',
  'flag.partner2': 'Pasangan 2',
  'flag.red': 'RED',
  'flag.green': 'GREEN',
  'flag.locked': 'Sudah pilih',
  'flag.waiting': 'Menunggu pilihan',
  'flag.voteAria': 'Pilih {{choice}} untuk {{partner}}',
  'flag.same': 'Sama',
  'flag.different': 'Beda pendapat',
  'flag.recapTitle': 'Mode Flag',
  'flag.recapAgree': 'Sepakat {{agree}} dari {{total}}',
  'flag.recapDisagree': 'Beda pendapat — bahas lagi?',
```

And after the `paywall.rooms.*` block:

```ts
  'paywall.flagMode.title': 'Mau semua kartu jadi Red vs Green?',
  'paywall.flagMode.body':
    'Akun Pro bisa menyalakan mode flag murni kapan saja di tengah sesi — satu dek penuh skenario buat dibahas berdua.',
```

- [ ] **Step 2: Add the English keys**

In `src/i18n/locales/en.ts`, same positions:

```ts
  'flag.toggle': 'Flag Mode',
  'flag.toggleHint': 'Every card becomes a Red vs Green scenario',
  'flag.proBadge': 'PRO',
  'flag.on': 'The next card switches to flag mode.',
  'flag.off': 'Back to regular questions.',
  'flag.exhausted': 'No flag cards left. Back to regular questions.',
  'flag.scenarioN': 'Scenario {{n}}',
  'flag.label': 'Red vs Green',
  'flag.partner1': 'Partner 1',
  'flag.partner2': 'Partner 2',
  'flag.red': 'RED',
  'flag.green': 'GREEN',
  'flag.locked': 'Locked in',
  'flag.waiting': 'Waiting for a pick',
  'flag.voteAria': 'Pick {{choice}} for {{partner}}',
  'flag.same': 'Same answer',
  'flag.different': 'You disagree',
  'flag.recapTitle': 'Flag Mode',
  'flag.recapAgree': 'Agreed on {{agree}} of {{total}}',
  'flag.recapDisagree': 'You disagreed — worth revisiting?',
```

```ts
  'paywall.flagMode.title': 'Want every card to be Red vs Green?',
  'paywall.flagMode.body':
    'Pro accounts can switch to pure flag mode any time mid-session — a whole deck of scenarios to argue over together.',
```

- [ ] **Step 3: Run the parity test**

Run: `yarn test src/i18n/i18n.test.ts`
Expected: PASS — identical key sets, no empty values. If it fails, the two lists have drifted; diff them and fix.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/id.ts src/i18n/locales/en.ts
git commit -m "feat: add flag mode translation keys"
```

---

### Task 8: FlagCard component

**Files:**
- Create: `src/components/FlagCard.tsx`

**Interfaces:**
- Consumes: `Glyph` names from Task 6; `flag.*` keys from Task 7; `Question` from Task 1.
- Produces: `<FlagCard question nomor favorit onToggleFavorit onVoted />` where `onVoted: (p1: FlagVote, p2: FlagVote) => void`.

- [ ] **Step 1: Create the component**

Create `src/components/FlagCard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { FlagVote, Question } from '../services/types'
import { useLang } from '../i18n/useLang'
import Glyph from './Glyph'

interface Props {
  question: Question
  nomor: number
  favorit: boolean
  onToggleFavorit: () => void
  /** Dipanggil sekali saat tap kedua masuk — induk yang menyimpan ke server. */
  onVoted: (p1: FlagVote, p2: FlagVote) => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        d="M12 21c-.4 0-.8-.14-1.1-.4C7 17.4 2.5 13.6 2.5 9.3 2.5 6.4 4.8 4 7.7 4c1.7 0 3.3.8 4.3 2.1C13 4.8 14.6 4 16.3 4c2.9 0 5.2 2.4 5.2 5.3 0 4.3-4.5 8.1-8.4 11.3-.3.26-.7.4-1.1.4Z"
        fill={filled ? 'var(--color-terracotta-400)' : 'none'}
        stroke={filled ? 'var(--color-terracotta-400)' : 'var(--color-cream-200)'}
        strokeWidth="1.8"
      />
    </svg>
  )
}

function VotePanel({
  partnerKey,
  vote,
  flipped,
  onPick,
}: {
  partnerKey: 'partner1' | 'partner2'
  vote: FlagVote | null
  flipped: boolean
  onPick: (v: FlagVote) => void
}) {
  const { t } = useTranslation()
  const partner = t(`flag.${partnerKey}`)
  return (
    <div className={`rounded-2xl border border-cream-200 bg-white p-3 ${flipped ? 'rotate-180' : ''}`}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-cocoa-500">
        {partner}
        {vote && <span className="ml-1.5 text-terracotta-600">· {t('flag.locked')}</span>}
      </p>
      {vote ? (
        // Pilihan disembunyikan sampai reveal supaya tidak bisa diintip.
        <div className="rounded-full border-2 border-dashed border-cream-200 bg-cream-100 py-2 text-center text-xs font-bold text-cocoa-500">
          {t('flag.locked')}
        </div>
      ) : (
        <div className="flex gap-2">
          {(['red', 'green'] as const).map((choice) => (
            <button
              key={choice}
              onClick={() => onPick(choice)}
              aria-label={t('flag.voteAria', { choice: t(`flag.${choice}`), partner })}
              className={`press flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 py-2 text-xs font-extrabold ${
                choice === 'red'
                  ? 'border-flag-red bg-flag-red-soft text-flag-red'
                  : 'border-flag-green bg-flag-green-soft text-flag-green'
              }`}
            >
              <Glyph name={choice === 'red' ? 'flagRed' : 'flagGreen'} className="h-[26px] w-[26px]" />
              {t(`flag.${choice}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultTile({ partnerKey, vote }: { partnerKey: 'partner1' | 'partner2'; vote: FlagVote }) {
  const { t } = useTranslation()
  const red = vote === 'red'
  return (
    <div
      className={`flex-1 rounded-2xl border-2 p-3 text-center ${
        red ? 'border-flag-red bg-flag-red-soft text-flag-red' : 'border-flag-green bg-flag-green-soft text-flag-green'
      }`}
    >
      <Glyph name={red ? 'flagRed' : 'flagGreen'} className="mx-auto h-[34px] w-[34px]" />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider">{t(`flag.${partnerKey}`)}</p>
    </div>
  )
}

export default function FlagCard({ question, nomor, favorit, onToggleFavorit, onVoted }: Props) {
  const reduce = useReducedMotion()
  const { lang } = useLang()
  const { t } = useTranslation()
  const [p1, setP1] = useState<FlagVote | null>(null)
  const [p2, setP2] = useState<FlagVote | null>(null)

  const revealed = p1 !== null && p2 !== null

  const pick = (who: 'p1' | 'p2', value: FlagVote) => {
    const next1 = who === 'p1' ? value : p1
    const next2 = who === 'p2' ? value : p2
    setP1(next1)
    setP2(next2)
    if (next1 && next2) onVoted(next1, next2)
  }

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{ transformPerspective: 1000 }}
      className="rounded-[32px] border border-cream-200 bg-cream-100 p-3 shadow-warm-md"
    >
      {revealed ? (
        <div className="flex gap-2">
          <ResultTile partnerKey="partner1" vote={p1} />
          <ResultTile partnerKey="partner2" vote={p2} />
        </div>
      ) : (
        <VotePanel partnerKey="partner1" vote={p1} flipped onPick={(v) => pick('p1', v)} />
      )}

      {/* Pita gelap: teks skenario, penanda mode, dan tombol favorit. */}
      <div className="my-2.5 rounded-2xl bg-cocoa-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cream-200">
            <Glyph name="flagRed" className="h-3.5 w-3.5 text-flag-red-on-dark" />
            <span aria-hidden>·</span>
            <Glyph name="flagGreen" className="h-3.5 w-3.5 text-flag-green-on-dark" />
            <span className="ml-1 text-terracotta-400">{t('flag.scenarioN', { n: nomor })}</span>
          </span>
          <button
            onClick={onToggleFavorit}
            aria-label={favorit ? t('card.favRemove') : t('card.favAdd')}
            aria-pressed={favorit}
            className="press -mt-1 rounded-full p-0.5"
          >
            <HeartIcon filled={favorit} />
          </button>
        </div>
        <p className="display-tight mt-2.5 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
          {question.text[lang]}
        </p>
      </div>

      {revealed ? (
        <p className="py-1 text-center font-display text-lg font-black italic text-terracotta-600">
          {p1 === p2 ? t('flag.same') : t('flag.different')}
        </p>
      ) : (
        <VotePanel partnerKey="partner2" vote={p2} flipped={false} onPick={(v) => pick('p2', v)} />
      )}
    </motion.article>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `yarn typecheck`
Expected: PASS. If Tailwind rejects `border-flag-red` etc., confirm Task 6 added the tokens inside the `@theme` block — Tailwind v4 generates utility classes from `--color-*` custom properties declared there.

- [ ] **Step 3: Commit**

```bash
git add src/components/FlagCard.tsx
git commit -m "feat: add FlagCard vote and reveal component"
```

---

### Task 9: Wire the session page

**Files:**
- Modify: `src/views/SessionPage.tsx`
- Modify: `src/components/PaywallModal.tsx:12-18`

**Interfaces:**
- Consumes: `currentCardId` (Task 3), `roomService.setFlagMode` / `saveFlagVotes` (Task 5), `FlagCard` (Task 8), `flag.*` keys (Task 7).
- Produces: nothing downstream.

- [ ] **Step 1: Widen the paywall reason**

In `src/components/PaywallModal.tsx`, change the `reason` prop type:

```ts
  reason: 'participants' | 'questions' | 'rooms' | 'install' | 'flagMode'
```

- [ ] **Step 2: Replace the direct deck reads**

In `src/views/SessionPage.tsx`, add the imports:

```ts
import { currentCardId } from '../lib/session'
import FlagCard from '../components/FlagCard'
import type { FlagVote, PaywallReason } from '../services/types'
```

Replace the three direct reads:
- line 53: `!questionService.getById(room.deck[room.currentIndex])` → `!questionService.getById(currentCardId(room) ?? '')`
- line 144: `const question = questionService.getById(room.deck[room.currentIndex])` → `const question = questionService.getById(currentCardId(room) ?? '')`
- line 65: `const count = room.currentIndex + 1` → `const count = room.currentIndex + room.flagIndex + 1`

Line 63 (`room.favorites.map(...)`) needs no change — it maps favourites, not the cursor.

- [ ] **Step 3: Add toggle and vote state**

Add alongside the existing `useState` declarations:

```ts
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('questions')
  const [toast, setToast] = useState<string | null>(null)
```

Change the existing paywall handler in `advance` to set the reason before opening:

```ts
      if (err instanceof PaywallError) {
        setResetAt(err.resetAt)
        setPaywallReason(err.reason)
        setPaywall(true)
      } else throw err
```

And pass it to the modal at the bottom of the file:

```tsx
      <PaywallModal open={paywall} reason={paywallReason} resetAt={resetAt} onClose={() => setPaywall(false)} />
```

- [ ] **Step 4: Add the toggle handler**

Add above the `return` of the active-session branch:

```ts
  const isPro = user?.plan === 'pro'
  const showFlagToggle =
    room.setup.category === 'pasangan' &&
    room.setup.participantCount === 2 &&
    room.flagReserve.length > 0

  const toggleFlagMode = async () => {
    if (!isPro) {
      setPaywallReason('flagMode')
      setPaywall(true)
      return
    }
    try {
      const next = await roomService.setFlagMode(room.id, !room.flagMode)
      setRoom(next)
      setToast(next.flagMode ? t('flag.on') : t('flag.off'))
    } catch (err) {
      if (err instanceof PaywallError) {
        setPaywallReason('flagMode')
        setPaywall(true)
      } else throw err
    }
  }

  const saveVotes = async (p1: FlagVote, p2: FlagVote) => {
    await roomService.saveFlagVotes(room.id, question.id, { p1, p2 })
  }
```

Add the auth hook at the top of the component, matching `src/views/RoomSetupPage.tsx:30`:

```ts
import { useAuth } from '../context/AuthContext'
```
```ts
  const { user } = useAuth()
```

- [ ] **Step 5: Detect the exhausted reserve**

In `advance`, after `setRoom(await roomService.advanceCard(room.id))`, replace that line with:

```ts
      const wasFlagMode = room.flagMode
      const next = await roomService.advanceCard(room.id)
      setRoom(next)
      // Server mematikan flagMode saat reserve habis — tidak perlu field khusus.
      if (wasFlagMode && !next.flagMode) setToast(t('flag.exhausted'))
```

Add an effect to clear the toast:

```ts
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])
```

- [ ] **Step 6: Render the toggle, the card, and the toast**

In the session header row, after the "Akhiri sesi" button:

```tsx
        {showFlagToggle && (
          <button
            onClick={toggleFlagMode}
            aria-pressed={room.flagMode}
            className={`press flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold ${
              room.flagMode
                ? 'border-terracotta-500 bg-terracotta-100 text-terracotta-700'
                : 'border-cream-200 bg-white text-cocoa-500'
            }`}
          >
            <Glyph name="flagRed" className="h-3.5 w-3.5 text-flag-red" />
            <Glyph name="flagGreen" className="h-3.5 w-3.5 text-flag-green" />
            {t('flag.toggle')}
            {!isPro && (
              <span className="rounded-full bg-butter-100 px-1.5 py-0.5 text-[10px] text-cocoa-700">
                {t('flag.proBadge')}
              </span>
            )}
          </button>
        )}
```

Import `Glyph` from `../components/Glyph`. Swap the card render inside `<AnimatePresence mode="wait">`:

```tsx
            {question.type === 'flag' ? (
              <FlagCard
                key={question.id}
                question={question}
                nomor={room.currentIndex + room.flagIndex + 1}
                favorit={room.favorites.includes(question.id)}
                onToggleFavorit={toggleFavorit}
                onVoted={saveVotes}
              />
            ) : (
              <QuestionCard
                key={question.id}
                question={question}
                nomor={room.currentIndex + room.flagIndex + 1}
                favorit={room.favorites.includes(question.id)}
                onToggleFavorit={toggleFavorit}
              />
            )}
```

Add the toast just above `<PaywallModal ...>`:

```tsx
      {toast && (
        <p role="status" className="rounded-2xl bg-cocoa-900 px-4 py-2.5 text-center text-sm font-semibold text-white">
          {toast}
        </p>
      )}
```

Also update the header card counter on line 173 from `room.currentIndex + 1` to `room.currentIndex + room.flagIndex + 1`.

- [ ] **Step 7: Verify**

Run: `yarn test && yarn typecheck`
Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/SessionPage.tsx src/components/PaywallModal.tsx
git commit -m "feat: render flag cards and the in-session flag toggle"
```

---

### Task 10: Session summary recap

**Files:**
- Modify: `src/views/SessionPage.tsx` (the `room.status === 'completed'` branch)

**Interfaces:**
- Consumes: `room.flagVotes` (Task 4), `flag.recap*` keys (Task 7).
- Produces: nothing downstream.

- [ ] **Step 1: Compute the recap**

Inside the `if (room.status === 'completed')` branch, after the existing `minutes` calculation:

```ts
    // Kartu flag yang di-skip tidak punya entri, jadi tidak ikut dihitung.
    const flagEntries = Object.entries(room.flagVotes)
    const agreed = flagEntries.filter(([, v]) => v.p1 === v.p2).length
    const disagreed = flagEntries
      .filter(([, v]) => v.p1 !== v.p2)
      .map(([qid]) => questionService.getById(qid))
      .filter((q) => q !== undefined)
```

- [ ] **Step 2: Render the section**

Insert between the two stat cards and the favourites block:

```tsx
        {flagEntries.length > 0 && (
          <div className="mt-6 rounded-3xl border border-cream-200 bg-white p-5 shadow-warm-sm">
            <h2 className="flex items-center gap-1.5 font-display text-lg font-bold italic">
              <Glyph name="flagRed" className="h-4 w-4 text-flag-red" />
              <Glyph name="flagGreen" className="h-4 w-4 text-flag-green" />
              {t('flag.recapTitle')}
            </h2>
            <p className="mt-2 text-sm font-bold text-cocoa-700">
              {t('flag.recapAgree', { agree: agreed, total: flagEntries.length })}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream-100">
              <div
                className="h-full rounded-full bg-flag-green"
                style={{ width: `${(agreed / flagEntries.length) * 100}%` }}
              />
            </div>

            {disagreed.length > 0 && (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-cocoa-500">
                  {t('flag.recapDisagree')}
                </p>
                <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {disagreed.map((q) => (
                    <div
                      key={q.id}
                      className="w-52 shrink-0 snap-start rounded-2xl bg-cocoa-900 p-4 text-sm leading-snug text-white"
                    >
                      {q.text[lang]}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
```

- [ ] **Step 3: Verify**

Run: `yarn test && yarn typecheck`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/SessionPage.tsx
git commit -m "feat: add flag recap to the session summary"
```

---

### Task 11: Admin support for flag cards

**Files:**
- Modify: `src/app/api/admin/questions/route.ts`
- Modify: `src/app/api/admin/questions/[id]/route.ts`
- Modify: `src/server/db/operations.ts` (`createQuestionRow`, `updateQuestionRow`)
- Modify: `src/views/admin/AdminQuestionsPage.tsx`
- Modify: `src/services/types.ts` (`AdminService` — no signature change needed; `Question` already carries `type`)

**Interfaces:**
- Consumes: `Question.type` (Task 1).
- Produces: admin CRUD that can create and edit flag cards.

- [ ] **Step 1: Accept type on create**

In `src/app/api/admin/questions/route.ts`, add the constant and validation. A flag card's category, depth, bias, and group flag are forced server-side, so a hand-rolled request cannot put a flag card in the keluarga deck:

```ts
import type { Bias, Category, Depth, QuestionType } from '@/services/types'

const TYPES: QuestionType[] = ['question', 'flag']
```

Replace the body of `POST` between the text check and `createQuestionRow` with:

```ts
    const type: QuestionType = TYPES.includes(body?.type) ? body.type : 'question'

    if (type === 'flag') {
      const data = await createQuestionRow({
        text_id: textId,
        text_en: textEn,
        category: 'pasangan',
        depth: 'ringan',
        bias: 'netral',
        for_group: false,
        type: 'flag',
      })
      return NextResponse.json(toQuestion(data), { status: 201 })
    }

    if (!CATEGORIES.includes(body.category)) {
      return jsonError(400, 'validation_error', 'Kategori tidak dikenal.')
    }
    if (!DEPTHS.includes(body.depth)) {
      return jsonError(400, 'validation_error', 'Depth tidak dikenal.')
    }
    if (!BIASES.includes(body.bias)) {
      return jsonError(400, 'validation_error', 'Bias tidak dikenal.')
    }
    const data = await createQuestionRow({
      text_id: textId,
      text_en: textEn,
      category: body.category,
      depth: body.depth,
      bias: body.bias,
      for_group: Boolean(body.forGroup),
      type: 'question',
    })
    return NextResponse.json(toQuestion(data), { status: 201 })
```

- [ ] **Step 2: Accept type in the operations layer**

In `src/server/db/operations.ts`, add to the `createQuestionRow` input type (line 416) after `for_group: boolean`:

```ts
  type: QuestionType
```

and to its `.values({...})` after `for_group: input.for_group,`:

```ts
      type: input.type,
```

`updateQuestionRow`'s patch is already `Partial<Omit<QuestionRow, ...>>`, so `patch.type` typechecks as soon as Task 1 added `type` to `QuestionRow`. Add one assignment line alongside the others (after the `for_group` line at 451):

```ts
  if (patch.type !== undefined) row.type = patch.type
```

Add `QuestionType` to the type imports at the top of the file.

- [ ] **Step 3: Mirror the validation on update**

In `src/app/api/admin/questions/[id]/route.ts`, replace the body of the `PATCH` handler between `const row: ... = {}` and the `return`:

```ts
    if (patch.text !== undefined) {
      row.text_id = patch.text.id
      row.text_en = patch.text.en
    }
    if (patch.type === 'flag') {
      // Kartu flag selalu pasangan/ringan/netral — abaikan field lain dari klien.
      row.type = 'flag'
      row.category = 'pasangan'
      row.depth = 'ringan'
      row.bias = 'netral'
      row.for_group = false
    } else {
      if (patch.type === 'question') row.type = 'question'
      if (patch.category !== undefined) row.category = patch.category
      if (patch.depth !== undefined) row.depth = patch.depth
      if (patch.bias !== undefined) row.bias = patch.bias
      if (patch.forGroup !== undefined) row.for_group = Boolean(patch.forGroup)
    }
```

- [ ] **Step 4: Add the admin UI**

In `src/views/admin/AdminQuestionsPage.tsx`:

Add `type` to `FormState` (line 15 area) and `EMPTY_FORM`:

```ts
  type: QuestionType
```
```ts
  type: 'question',
```

Add a second filter state next to the existing one (line 40):

```ts
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
```

Populate `type` when editing an existing row, alongside `category`/`depth`/`bias` (line 57 area):

```ts
      type: q.type,
```

Replace the `visible` computation on line 98:

```ts
  const visible = questions.filter(
    (q) =>
      (filter === 'all' || q.category === filter) &&
      (typeFilter === 'all' || q.type === typeFilter),
  )
```

Add a type filter row directly below the existing category filter `<div className="flex gap-2">…</div>` (closes line 117), reusing its button styling:

```tsx
        <div className="flex gap-2">
          {(['all', 'question', 'flag'] as const).map((ty) => (
            <button
              key={ty}
              onClick={() => setTypeFilter(ty)}
              className={`press rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                typeFilter === ty
                  ? 'bg-cocoa-900 text-cream-50'
                  : 'border border-cream-200 bg-white/60 text-cocoa-700 hover:bg-cream-100'
              }`}
            >
              {t(
                ty === 'all'
                  ? 'admin.questions.typeAll'
                  : ty === 'flag'
                    ? 'admin.questions.typeFlag'
                    : 'admin.questions.typeQuestion',
              )}
            </button>
          ))}
        </div>
```

In the form, add a type selector as the first field after the two textareas (before the category `<div>` on line 160):

```tsx
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="q-type">
                {t('admin.questions.type')}
              </label>
              <select
                id="q-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
                className={fieldClass}
              >
                <option value="question">{t('admin.questions.typeQuestion')}</option>
                <option value="flag">{t('admin.questions.typeFlag')}</option>
              </select>
            </div>
```

Wrap the category, depth, bias, and forGroup fields in `{form.type === 'question' && (<>…</>)}` so they disappear for flag cards. Then change the submit payload (line 70 area) to:

```ts
        text: { id: form.textId.trim(), en: form.textEn.trim() },
        type: form.type,
        ...(form.type === 'question'
          ? {
              category: form.category,
              depth: form.depth,
              bias: form.bias,
              forGroup: form.forGroup || undefined,
            }
          : {}),
```

Import `QuestionType` from `../../services/types`. Add the labels to both locale files, keeping the key sets identical:

```ts
  'admin.questions.type': 'Tipe',
  'admin.questions.typeQuestion': 'Pertanyaan',
  'admin.questions.typeFlag': 'Kartu Flag',
  'admin.questions.typeAll': 'Semua',
```

```ts
  'admin.questions.type': 'Type',
  'admin.questions.typeQuestion': 'Question',
  'admin.questions.typeFlag': 'Flag card',
  'admin.questions.typeAll': 'All',
```

- [ ] **Step 5: Verify**

Run: `yarn test && yarn typecheck`
Expected: both PASS, including the i18n parity test.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/questions src/server/db/operations.ts \
        src/views/admin/AdminQuestionsPage.tsx src/i18n/locales
git commit -m "feat: admin CRUD for flag cards"
```

---

### Task 12: Write and seed the 60 scenarios

**Files:**
- Modify: `drizzle/seed/questions.sql`
- Modify: `src/server/db/seed.ts`

**Interfaces:**
- Consumes: `questions.type` (Task 1).
- Produces: 60 rows with `type='flag'`, codes `f-001` through `f-060`.

- [ ] **Step 1: Teach the seeder about the type column**

`src/server/db/seed.ts` builds a temp table from the SQL file, then copies it into `questions`.

In the `create temp table seed_questions` block (line 94), add a final column. The default is what lets every existing 7-column row in the SQL file keep parsing unchanged:

```sql
        for_group boolean not null default false,
        type question_type not null default 'question'
```

In the `.replace(...)` on line 32 that rewrites the insert header, add `type` to the column list:

```ts
      '(question_code, text_id, text_en, category, depth, bias, for_group, type)',
```

Then update the copy statement (line 105) to carry the column through:

```sql
      insert into questions (question_code, text_id, text_en, category_id, depth, bias, for_group, type)
      select
        sq.question_code,
        sq.text_id,
        sq.text_en,
        qc.id,
        sq.depth,
        sq.bias,
        sq.for_group,
        sq.type
      from seed_questions sq
      join question_category qc on qc.name = sq.category
      on conflict (question_code) do update set
        text_id = excluded.text_id,
        text_en = excluded.text_en,
        category_id = excluded.category_id,
        depth = excluded.depth,
        bias = excluded.bias,
        for_group = excluded.for_group,
        type = excluded.type;
```

Read line 32's exact current string before editing — it must match character for character for the `.replace` to fire.

- [ ] **Step 2: Write the scenarios**

Append 60 rows to `drizzle/seed/questions.sql` following the existing row format exactly — note that apostrophes are escaped by doubling (`''`). Every row uses `'pasangan', 'ringan', 'netral', false, 'flag'`.

Each card is a **statement of an observable behaviour**, not a question — the question is implicit in the two buttons. Indonesian: casual second person (`dia`, `kamu`), 8–18 words, present tense, one concrete behaviour, no verdict language in the text. English: a natural equivalent, not a literal translation.

Spread across the 12 themes from the spec, 5 cards each: digital privacy, money, exes, social media, opposite-sex friends, family, conflict style, personal space, daily rhythm, requests to change, consistency and accountability, future plans.

**Two hard editorial rules:**
1. **Only genuinely debatable grey areas.** "Dia baca chat kamu tanpa izin" splits a room; "dia inget hari jadian" does not. Published listicles are consensus material and make dead cards — the live arguments are in phone-checking and split bill.
2. **Nothing where "green flag" is the harmful answer.** No violence, coercion, financial control, or isolation from friends and family. Those are not debate topics.

Format:

```sql
  ('f-001', 'Dia minta password semua sosmed kamu di awal hubungan.', 'They ask for the passwords to all your social accounts early on.', 'pasangan', 'ringan', 'netral', false, 'flag'),
  ('f-002', 'Dia masih follow dan sesekali like foto mantannya.', 'They still follow their ex and like a photo now and then.', 'pasangan', 'ringan', 'netral', false, 'flag'),
```

Leave the existing 7-column rows alone — Step 1's `default 'question'` on the temp-table column means they keep parsing unchanged, so the diff is purely additive.

- [ ] **Step 3: Verify the SQL parses**

Run: `yarn db:seed`
Expected: completes without error. If a syntax error appears, it is almost certainly an unescaped apostrophe — search for a single `'` inside a text literal.

- [ ] **Step 4: Verify the count**

Run: `yarn db:seed` a second time.
Expected: completes again without error — the `on conflict (question_code) do update` makes it idempotent. Then confirm 60 flag rows exist by querying the database directly, or by loading `/admin/questions` and filtering to Kartu Flag.

- [ ] **Step 5: Commit**

```bash
git add drizzle/seed/questions.sql src/server/db/seed.ts
git commit -m "feat: seed 60 red vs green flag scenarios"
```

---

## Final Verification

- [ ] Run `yarn test` — all suites pass
- [ ] Run `yarn typecheck` — clean
- [ ] Run `yarn build` — the production build succeeds
- [ ] Manual: start a pasangan pair room as a **free** account. Confirm card 5 is a flag card, that voting reveals both answers, and that the toggle shows a PRO badge and opens the paywall.
- [ ] Manual: same as a **Pro** account. Confirm the toggle switches the next card to a flag scenario, that turning it off returns to the classic deck at the right position, and that ending the session shows the recap with the disagreed cards.
- [ ] Manual: start a **teman** room and a **group** pasangan room. Confirm no flag cards appear and no toggle is rendered.
