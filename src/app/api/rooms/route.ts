import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { toQuestion, toRoom } from '@/server/mappers'
import type { QuestionRow, RoomRow } from '@/server/mappers'
import { buildDeck } from '@/lib/deck'
import type { Category, Personality } from '@/services/types'

const CATEGORIES: Category[] = ['pasangan', 'teman', 'keluarga']
const PERSONALITIES: Personality[] = ['introvert', 'extrovert']

export async function GET() {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(((data ?? []) as RoomRow[]).map(toRoom))
  })
}

/**
 * Buat room: deck dikomposisi di server dari bank pertanyaan, lalu
 * kuota free (peserta, jumlah room) ditegakkan RPC create_room.
 */
export async function POST(request: Request) {
  return withErrors(async () => {
    const { supabase } = await requireUser()
    const body = await request.json().catch(() => null)
    const participantCount = Number(body?.participantCount)
    const category = body?.category as Category
    const personalities = body?.personalities as [Personality, Personality] | undefined

    if (!Number.isInteger(participantCount) || participantCount < 2) {
      return jsonError(400, 'validation_error', 'participantCount minimal 2.')
    }
    if (!CATEGORIES.includes(category)) {
      return jsonError(400, 'validation_error', 'Kategori tidak dikenal.')
    }
    if (personalities !== undefined) {
      const valid =
        participantCount === 2 &&
        Array.isArray(personalities) &&
        personalities.length === 2 &&
        personalities.every((p) => PERSONALITIES.includes(p))
      if (!valid) return jsonError(400, 'validation_error', 'personalities tidak valid.')
    }

    const { data: bankRows, error: bankError } = await supabase.from('questions').select('*')
    if (bankError) throw bankError
    const bank = ((bankRows ?? []) as QuestionRow[]).map(toQuestion)
    const deck = buildDeck(bank, { participantCount, category, personalities }).map((q) => q.id)
    if (deck.length === 0) {
      return jsonError(400, 'validation_error', 'Tidak ada kartu untuk kombinasi ini.')
    }

    const { data, error } = await supabase.rpc('create_room', {
      p_participant_count: participantCount,
      p_category: category,
      p_personalities: personalities ?? null,
      p_deck: deck,
    })
    if (error) throw error
    return NextResponse.json(toRoom(data as RoomRow), { status: 201 })
  })
}
