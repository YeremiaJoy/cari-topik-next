# Red Flag vs Green Flag Mode — Design

Date: 2026-08-01
Status: Approved for planning

## Overview

A second card type for CariTopik. Instead of a question to answer, a **flag card** states a
relationship behaviour ("Dia baca chat kamu tanpa izin"). Both partners privately tap RED or
GREEN on the same phone; when the second vote lands the card reveals both answers and whether
they matched. Disagreement is the point — it is what starts the conversation.

Flag cards appear only in **pasangan** rooms with **exactly 2 participants**. They are sprinkled
into every such deck. A Pro-only in-session toggle switches the room to **pure flag mode**, where
every subsequent card is a flag scenario.

### Goals

- Give couples a faster, more reactive interaction than the existing one-question-at-a-time deck.
- Ship a Pro benefit that is felt during play, not just listed on the pricing page.
- Grow the card bank with content anchored to arguments Indonesians actually have.

### Non-goals

- Real-time multi-device sync. The room stays single-device.
- Cross-user vote aggregation ("72% bilang red flag"). Explicitly cut.
- A per-card follow-up question. Explicitly cut — reveal shows the two votes and the verdict, then next.
- Flag cards for teman, keluarga, or group (3+) rooms.
- Yellow flag as a third option.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Mechanic | Vote, then reveal | The disagreement moment is the whole appeal of the trend |
| Voting UX | Split screen, both tap on one phone | No hand-off; the room is already single-device |
| Toggle placement | In-session, not setup | Chosen by the user: flip mid-game without leaving the room |
| Reveal payoff | Two votes + match verdict, then next | Keeps momentum; halves the content work per card |
| Session recap | Agreement count + list of disagreed cards | The disagreements are the takeaway worth revisiting |
| Free access | Sprinkled cards yes, pure-flag toggle no | Free quota already caps exposure at ~1 card per 6h window |
| Storage | `questions.type` column, not a separate table | Deck stays `uuid[]`; one cache, one admin page, one lookup |
| Card visual | Warm Duel (cream shell, dark cocoa scenario band) | Reads as "still CariTopik, new game" |
| Flag marks | Duotone pennant glyphs, no emoji | Matches `Glyph.tsx`; survives the 14px chip |

## Data Model

### Migration: `questions`

```sql
create type question_type as enum ('question', 'flag');
alter table questions add column type question_type not null default 'question';
```

Existing rows are unaffected by the default. Flag rows are written with
`category_id = pasangan`, `depth = 'ringan'`, `bias = 'netral'`, `for_group = false`. Those three
values are filler: every query that reads depth or bias filters on `type = 'question'` first, so
they are never interpreted. They exist only so the columns stay `not null` and no existing row
needs rewriting.

### Migration: `rooms`

```sql
create type room_pool as enum ('deck', 'flag');
alter table rooms
  add column flag_mode    boolean   not null default false,
  add column flag_reserve uuid[]    not null default '{}',
  add column flag_index   integer   not null default 0,
  add column current_pool room_pool not null default 'deck',
  add column flag_votes   jsonb     not null default '{}';
```

`flag_votes` shape:

```json
{ "<questionId>": { "p1": "red", "p2": "green" } }
```

### Types (`src/services/types.ts`)

```ts
export type QuestionType = 'question' | 'flag'
export type FlagVote = 'red' | 'green'

export interface Question {
  // ...existing fields
  type: QuestionType
}

export interface Room {
  // ...existing fields
  flagMode: boolean
  flagReserve: string[]
  flagIndex: number
  currentPool: 'deck' | 'flag'
  flagVotes: Record<string, { p1: FlagVote; p2: FlagVote }>
}

export type PaywallReason = 'participants' | 'questions' | 'rooms' | 'flagMode'
```

## Deck Composition

`buildDeck` in `src/lib/deck.ts` gains a second return value. Signature becomes:

```ts
export function buildDeck(
  bank: Question[],
  setup: RoomSetup,
  shuffle = defaultShuffle,
): { deck: Question[]; flagReserve: Question[] }
```

Algorithm:

1. Build the classic deck exactly as today, from `bank.filter(q => q.type === 'question')`.
   The existing depth ordering and personality bias logic is unchanged.
2. If the room is **not** pasangan with `participantCount === 2`, return
   `{ deck: classic, flagReserve: [] }`. No flag cards anywhere else.
3. Otherwise take `bank.filter(q => q.type === 'flag')`, shuffle it via the injected `shuffle`.
4. Split: one flag card is inlined after every 4th classic card, never at index 0.
   `inlineCount = min(floor(classic.length / 4), flagPool.length)`.
   The first `inlineCount` shuffled flag cards are inlined; the remainder becomes `flagReserve`.
5. If the flag pool is empty, this degrades to step 2's result. The migration can therefore ship
   before any flag content exists.

Inline positions are the merged-array indices 4, 9, 14, … — one flag card after each run of four
classic cards, so the deck always opens on a classic question. With the current bank of pasangan
pair questions this yields roughly 14 inlined cards, the rest going to reserve.

The cadence is deterministic rather than random so tests can assert positions. The
"random shuffle" feel comes from the pool being shuffled, not the positions.

**Interaction with the free quota.** A free session sees 5 cards per 6-hour window, and the first
inlined flag card sits at merged index 4 — the 5th card. Free users therefore play exactly one
flag card before the window closes. This is intentional and should be preserved if the cadence is
ever tuned: it is the strongest available position for conversion.

### Existing call sites

The new return shape touches two callers:

- `src/server/db/operations.ts:527` destructures both halves and persists `flag_reserve`.
- `src/services/index.ts:17` exposes `questionService.buildDeck`, which is **dead code** — nothing
  calls it. Delete it, along with `QuestionService.buildDeck` in `src/services/types.ts:193`,
  rather than migrating it to the new shape.

`SessionPage.tsx` reads `room.deck[room.currentIndex]` directly at lines 53, 63, and 144. All three
break under two pools. Extract a `currentCardId(room)` helper into `src/lib/deck.ts` implementing
the rule in the next section, and route every call site through it.

## Advance Algorithm

The current card is:

```ts
currentPool === 'deck' ? deck[currentIndex] : flagReserve[flagIndex]
```

`advanceRoomCard` in `src/server/db/operations.ts` becomes:

```
// 1. consume the current card by bumping its own pool's cursor
if current_pool == 'deck':  nextDeckIdx = current_index + 1; nextFlagIdx = flag_index
else:                       nextFlagIdx = flag_index + 1;    nextDeckIdx = current_index

nextPlayed = nextDeckIdx + nextFlagIdx

// 2. choose the pool for the next card
wantFlag       = flag_mode && nextFlagIdx < flag_reserve.length
nextPool       = wantFlag ? 'flag' : 'deck'
flagExhausted  = flag_mode && !wantFlag        // pure mode ran out; fall back
if flagExhausted: flag_mode = false

// 3. completion
if nextPool == 'deck' && nextDeckIdx >= deck.length:
    status = 'completed'; ended_at = now

// 4. free quota — see below

// 5. persist current_index, flag_index, current_pool, flag_mode
```

`flagExhausted` is returned to the client so the session can toast "Kartu flag habis, lanjut ke
pertanyaan biasa."

### Free quota

Every occurrence of `nextIndex` in the existing free-plan branch of `advanceRoomCard`
(`src/server/db/operations.ts:586-611`) becomes `nextPlayed`. Flag cards therefore count against
the 5-card window like any other card.

This changes the meaning of `rooms.window_start` from "deck index" to "cards played". For every
existing room `flag_index` is 0, so the two are numerically identical and **no data migration is
required**.

### Toggle timing

Flipping `flag_mode` does not change the card on screen — step 2 above only runs on the next
advance. Swapping the card mid-vote would discard votes already cast.

## API

| Endpoint | Behaviour |
|---|---|
| `PATCH /api/rooms/:id/flag-mode` | Body `{ enabled: boolean }`. Free plan → 402 `paywall:flagMode`. Non-pasangan or group room → 400. Enabling with an empty `flag_reserve` → 400 with a readable message. |
| `PUT /api/rooms/:id/flag-votes/:questionId` | Body `{ p1: FlagVote, p2: FlagVote }`. Merges into `flag_votes`. Unknown question, or a question whose `type !== 'flag'` → 400. Room not owned by the caller → 404. |

`GET /api/questions` gains `type` in its payload via `toQuestion`. No new endpoint — the client
cache already fetches the whole bank once.

Votes are sent in **one request, when the second tap lands**. The client holds the first vote in
component state. Consequence: a page refresh between the two taps loses the first vote and the
card restarts from the voting state. Accepted — the alternative is a network round-trip per tap on
a screen both people are watching.

## Frontend

### `src/components/FlagCard.tsx` (new)

Two local states: `voting` → `revealed`.

**Voting.** Cream shell and shadow matching `QuestionCard.tsx`. Three stacked zones:

- Partner 1 panel, `rotate-180`, so they read it facing you across the phone.
- A `cocoa-900` band holding the scenario text (Fraunces, same sizes as the question card), a
  `flagRed · vs · flagGreen · Skenario N` chip, and the favourite heart.
- Partner 2 panel, upright.

Each panel holds a RED and a GREEN pill. On tap the panel collapses to a locked state reading
"sudah pilih" with no indication of which was chosen.

**Revealed.** Panels are replaced by two result tiles (one pennant each, tinted) and a verdict
line: `Sama` or `Beda pendapat`, Fraunces italic in terracotta, flanked by the two marks. The
primary "Lanjut" button appears only here; before reveal only "Skip" is available. Skip advances
without recording a vote.

Props: `{ question, nomor, favorit, onToggleFavorit, onVoted(p1, p2) }`. The component owns the
vote state; `SessionPage` owns persistence.

### `src/components/Glyph.tsx`

Two new names, `flagRed` and `flagGreen` — duotone pennants: pole plus banner filled in
`currentColor`, with a cream fold line at 55% opacity. Red has a notched trailing edge, green a
rounded one, so the pair is distinguishable with colour removed. This matters: red/green is the
worst pair for deuteranopia, and the marks must also survive a desaturated screenshot.

### `src/app/globals.css`

```css
--color-flag-red: #c0392b;        --color-flag-red-soft: #fbe3df;
--color-flag-green: #2f8f6b;      --color-flag-green-soft: #dcf0e7;
--color-flag-red-on-dark: #ff8a72;
--color-flag-green-on-dark: #5fd6a8;
```

The `-on-dark` pair is for marks sitting on the `cocoa-900` band.

### `src/views/SessionPage.tsx`

- Renders `FlagCard` when `question.type === 'flag'`, `QuestionCard` otherwise.
- Header gains the flag toggle, rendered only for pasangan + `participantCount === 2` rooms.
  Pro: optimistic `PATCH`, then a toast "Kartu berikutnya jadi mode flag". Free: rendered with a
  PRO badge; tapping opens `PaywallModal` with `reason="flagMode"`.
- Summary screen gains a flag section when `flagVotes` is non-empty: an agreement bar
  ("Sepakat 7 dari 9") and a horizontal scroller of the disagreed scenarios, reusing the existing
  favourites-scroller markup. Both numbers are derived from `flagVotes` alone, so a skipped flag
  card counts toward neither the numerator nor the denominator.

### `src/components/PaywallModal.tsx`

Handles the new `flagMode` reason. Copy focuses on pure-flag mode, since sprinkled cards are free.

### i18n

New `flag.*` namespace in `src/i18n/locales/{id,en}.ts`: toggle label and PRO badge, the
"sudah pilih" lock state, RED/GREEN button labels, `Sama` / `Beda pendapat`, the exhausted-reserve
toast, the recap heading and agreement string, and the paywall copy. The existing i18n parity test
covers key coverage across both locales.

Emoji is not used anywhere in this feature. The existing 🃏 / ⏱️ / ❤️ on the summary screen are
left as they are — out of scope.

## Content

### Volume and format

60 scenarios, bilingual ID + EN, codes `f-001` through `f-060`, appended to
`drizzle/seed/questions.sql` with `type='flag'` — the same generated-file convention already in
use. Each is a **statement of a behaviour**, not a question; the question is implicit in the two
buttons.

Tone: casual second person ("dia", "kamu"), 8–18 words, one concrete observable behaviour,
present tense, no verdict language embedded in the text. The EN version is a natural
equivalent, not a literal translation.

### Themes

Drawn from Indonesian relationship discourse (sources below). Roughly 5 cards per theme:

1. Digital privacy — checking the phone, sharing passwords, live location
2. Money — split bill, who pays, lending, salary transparency
3. Exes — still in contacts, old photos kept, still following on IG
4. Social media — hard launch vs private relationship, posting frequency, comments
5. Opposite-sex friends — a close friend, hanging out one-on-one
6. Family — parental involvement, restu, closeness to a parent
7. Conflict style — silent treatment, days of no contact, raising your voice
8. Personal space — alone time, hobbies, gaming hours
9. Daily rhythm — slow replies, LDR video-call schedules, hourly check-ins
10. Requests to change — appearance, dropping a hobby, changing friends
11. Consistency and accountability — admitting fault, actually changing after feedback
12. Future plans — marriage timeline, career vs relationship

### Editorial rules

**Only genuinely debatable grey areas.** "Dia baca chat kamu tanpa izin" splits a room; "dia
inget hari jadian" does not. The research bears this out — the published Indonesian listicles are
consensus material (open communication, emotional support, respect) and make dead cards. The live
arguments are in split bill and phone-checking, where the polarisation is real.

**Nothing where "green flag" is the harmful answer.** No violence, coercion, financial control, or
isolation from friends and family. Those are not debate topics, and a card inviting a couple to
argue one is a liability.

**No yellow flag.** Two options only.

### Sources

- [Beautynesia — 8 Contoh Red Flag dalam Hubungan](https://www.beautynesia.id/life/sering-dikira-sama-ini-8-contoh-red-flag-dalam-hubungan-yang-berbeda-dengan-ujian-hubungan/b-295947)
- [Halodoc — Mengenal Green Flag dalam Hubungan](https://www.halodoc.com/artikel/mengenal-green-flag-dalam-hubungan-pengertian-dan-ciri-cirinya)
- [CNN Indonesia — Apa Itu Green Flag](https://www.cnnindonesia.com/edukasi/20251027103821-561-1288772/apa-itu-green-flag-ini-arti-dan-ciri-cirinya-dalam-hubungan)
- [IDN Times Jateng — Red Flag Pasangan Jawa yang Sering Dianggap Wajar](https://jateng.idntimes.com/news/jawa-tengah/6-red-flag-pasangan-jawa-yang-sering-dianggap-wajar-awas-toksik-00-2m8jx-6863gv)
- [Jawaban.com — Split Bill Saat Pacaran Itu Wajar atau Perhitungan?](https://www.jawaban.com/read/article/id/2026/05/13/80/260513153900/split_bill_saat_pacaran_itu_wajar_atau_justru_malah_jadi_perhitungan)
- [Lemon8 — Split Bill Saat Pacaran: Pendapat Netizen](https://www.lemon8-app.com/@laalaalife_/7431270377596355088?region=id)
- [Lemon8 — Cek HP Pacar: Wajib atau Tidak?](https://www.lemon8-app.com/rebeccavaleryy/7354251570948735489?region=id)

## Admin

`src/views/admin/AdminQuestionsPage.tsx` gains:

- A type filter: Semua / Pertanyaan / Flag.
- A type field in the create/edit form. Selecting Flag hides the depth and bias inputs and forces
  `depth='ringan'`, `bias='netral'`, `category='pasangan'`, `for_group=false`.

`src/app/api/admin/questions/route.ts` and `[id]/route.ts` validate the same constraints
server-side, so a hand-rolled request cannot create a flag card in the keluarga deck.

Admin analytics are unchanged — flag cards are counted as questions in the existing charts.

## Failure Modes

| Situation | Behaviour |
|---|---|
| Free user taps the toggle | 402 `paywall:flagMode`, paywall modal opens |
| Toggle on a group or non-pasangan room | 400; the control is not rendered there anyway |
| Toggle ON with empty `flag_reserve` | 400 with a readable message, rejected up front |
| Pure mode runs out of reserve | Falls back to the classic deck, `flag_mode = false`, toast |
| Vote for an unknown or non-flag question | 400 |
| Vote on a room the caller does not own | 404 |
| Refresh between the two votes | Card restarts in the voting state; first vote lost |
| Flag bank is empty | Deck build degrades to today's behaviour; toggle hidden |

## Testing

`src/lib/deck.test.ts` extends to cover, via the injected shuffle:

- the every-4th inline cadence, and that index 0 is never a flag card
- the inline/reserve split, including `inlineCount` capped by pool size
- pasangan + 2 participants only; teman, keluarga, and group all get an empty reserve
- empty flag bank degrades to the current output exactly

New tests around `advanceRoomCard`:

- pool switching in both directions, and that the toggle only takes effect on the next advance
- reserve exhaustion falling back to the classic deck and clearing `flag_mode`
- the completion condition with a non-empty reserve still outstanding
- **free quota counting cards from both pools against a single window** — the regression most
  likely to slip through, since it is the one place the two cursors have to be summed

Vote persistence is covered by a shape test on the `flag_votes` merge.

## Out of Scope

Real-time two-device play, crowd vote statistics, per-card follow-up questions, yellow flag,
flag cards for teman/keluarga/group, sharing a reveal as an image, and any change to the existing
summary-screen emoji.
