import { and, count, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { buildDeck } from '@/lib/deck'
import {
  DEFAULT_APP_CONFIG,
  QUESTION_RESET_MS,
  ROOM_DELETE_COOLDOWN_MS,
  type AppConfig,
  type Category,
  type Depth,
  type Bias,
  type Personality,
  type Plan,
  type Role,
  type User,
} from '@/services/types'
import { HttpError } from '../httpError'
import { toQuestion } from '../mappers'
import type { AppConfigRow, PlanBenefitRow, ProfileRow, QuestionRow, RoomRow } from '../mappers'
import { getDb } from './index'
import {
  announcements,
  app_config,
  planBenefits,
  plans,
  providers,
  questionCategories,
  questions,
  roles,
  rooms,
  subscriptions,
  transactions,
  users,
  userLogs,
  userPlans,
  userRoles,
} from './schema'
import { mapMidtransStatus, type TransactionStatus } from '../midtrans'
import {
  deletionStatusSequence,
  deriveConfigFromFreeBenefit,
  isAccountActive,
  resolveActiveRoleName,
  resolveCurrentPlanName,
  type UserStatus,
} from './status'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const APP_CONFIG_ID = '00000000-0000-4000-8000-000000000301'

export const defaultAppConfigRow: AppConfigRow = {
  free_max_participants: DEFAULT_APP_CONFIG.freeMaxParticipants,
  free_max_questions: DEFAULT_APP_CONFIG.freeMaxQuestions,
  free_max_rooms: DEFAULT_APP_CONFIG.freeMaxRooms,
  pro_price: DEFAULT_APP_CONFIG.proPrice,
  pro_price_after_discount: DEFAULT_APP_CONFIG.proPriceAfterDiscount,
  maintenance_enabled: false,
  maintenance_message_id: '',
  maintenance_message_en: '',
}

function requireUuid(id: string, code = 'not_found', message = 'Data tidak ditemukan.') {
  if (!UUID_RE.test(id)) throw new HttpError(404, code, message)
}

type SelectClient = Pick<ReturnType<typeof getDb>, 'select'>

async function getPlanIdByName(client: SelectClient, name: Plan) {
  const [row] = await client
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.name, name), eq(plans.is_active, true), isNull(plans.deleted_at)))
    .limit(1)
  if (!row) throw new HttpError(500, 'config_error', `Plan ${name} belum di-seed.`)
  return row.id
}

async function getRoleIdByName(client: SelectClient, name: Role) {
  const [row] = await client
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.name, name), isNull(roles.deleted_at)))
    .limit(1)
  if (!row) throw new HttpError(500, 'config_error', `Role ${name} belum di-seed.`)
  return row.id
}

async function getCategoryByName(client: SelectClient, name: Category) {
  const [row] = await client
    .select({ id: questionCategories.id, name: questionCategories.name })
    .from(questionCategories)
    .where(and(eq(questionCategories.name, name), eq(questionCategories.is_active, true), isNull(questionCategories.deleted_at)))
    .limit(1)
  if (!row) throw new HttpError(400, 'validation_error', 'Kategori tidak dikenal.')
  return row
}

async function getCurrentPlanRows(client: SelectClient, userId: string) {
  return await client
    .select({
      name: plans.name,
      started_at: userPlans.started_at,
      ended_at: userPlans.ended_at,
      deleted_at: userPlans.deleted_at,
    })
    .from(userPlans)
    .innerJoin(plans, eq(userPlans.plan_id, plans.id))
    .where(and(eq(userPlans.user_id, userId), isNull(plans.deleted_at)))
}

async function getActiveRoleRows(client: SelectClient, userId: string) {
  return await client
    .select({
      name: roles.name,
      created_at: userRoles.created_at,
      deleted_at: userRoles.deleted_at,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(and(eq(userRoles.user_id, userId), isNull(roles.deleted_at)))
}

async function getProfileView(client: SelectClient, userId: string): Promise<ProfileRow | null> {
  const [profile] = await client.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!profile) return null
  const [planRows, roleRows] = await Promise.all([
    getCurrentPlanRows(client, userId),
    getActiveRoleRows(client, userId),
  ])
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar_url: profile.avatar_url,
    status: profile.status as UserStatus,
    plan: resolveCurrentPlanName(planRows as Array<{
      name: Plan
      started_at: string
      ended_at: string | null
      deleted_at: string | null
    }>),
    role: resolveActiveRoleName(roleRows as Array<{
      name: Role
      created_at: string
      deleted_at: string | null
    }>),
    created_at: profile.created_at,
  }
}

async function getFreeBenefit(client: SelectClient): Promise<PlanBenefitRow | null> {
  const [row] = await client
    .select({
      max_room: planBenefits.max_room,
      mode: planBenefits.mode,
      question_per_session: planBenefits.question_per_session,
      personalized_deck: planBenefits.personalized_deck,
      offline_support: planBenefits.offline_support,
    })
    .from(planBenefits)
    .innerJoin(plans, eq(planBenefits.plan_id, plans.id))
    .where(and(eq(plans.name, 'free'), eq(plans.is_active, true), isNull(plans.deleted_at), isNull(planBenefits.deleted_at)))
    .limit(1)
  return row ?? null
}

async function getPriceConfig(client: SelectClient = getDb()) {
  const [row] = await client
    .select({
      price: plans.price,
      price_after_discount: plans.price_after_discount,
    })
    .from(plans)
    .where(and(eq(plans.name, 'pro'), eq(plans.is_active, true), isNull(plans.deleted_at)))
    .limit(1)
  return row ?? null
}

async function getAppConfig(client: SelectClient = getDb()) {
  const [row] = await client.select().from(app_config).limit(1)
  return row ?? null
}

async function getQuestionRows(client: SelectClient): Promise<QuestionRow[]> {
  const rows = await client
    .select({
      id: questions.id,
      question_code: questions.question_code,
      text_id: questions.text_id,
      text_en: questions.text_en,
      category: questionCategories.name,
      depth: questions.depth,
      bias: questions.bias,
      for_group: questions.for_group,
    })
    .from(questions)
    .innerJoin(questionCategories, eq(questions.category_id, questionCategories.id))
    .orderBy(desc(questions.created_at), questions.id)
  return rows as QuestionRow[]
}

async function getRoomRow(client: SelectClient, userId: string, roomId: string): Promise<RoomRow | null> {
  const [row] = await client
    .select({
      id: rooms.id,
      user_id: rooms.user_id,
      participant_count: rooms.participant_count,
      category: questionCategories.name,
      personalities: rooms.personalities,
      deck: rooms.deck,
      current_index: rooms.current_index,
      favorites: rooms.favorites,
      status: rooms.status,
      window_start: rooms.window_start,
      exhausted_at: rooms.exhausted_at,
      created_at: rooms.created_at,
      ended_at: rooms.ended_at,
    })
    .from(rooms)
    .innerJoin(questionCategories, eq(rooms.category_id, questionCategories.id))
    .where(and(eq(rooms.id, roomId), eq(rooms.user_id, userId)))
    .limit(1)
  return (row ?? null) as RoomRow | null
}

const GOOGLE_PROVIDER = 'google'

export async function syncAuthProfile(input: {
  sub: string
  name: string
  email: string
  avatarUrl: string
}): Promise<ProfileRow> {
  return await getDb().transaction(async (tx) => {
    // Resolusi baris user: cocokkan google_sub, lalu email (backfill), else buat baru.
    let [existing] = await tx.select().from(users).where(eq(users.google_sub, input.sub)).limit(1)
    if (!existing) {
      const [byEmail] = await tx
        .select()
        .from(users)
        .where(and(eq(users.email, input.email), isNull(users.deleted_at)))
        .limit(1)
      if (byEmail) {
        await tx
          .update(users)
          .set({ google_sub: input.sub, updated_at: sql`now()` })
          .where(eq(users.id, byEmail.id))
        existing = { ...byEmail, google_sub: input.sub }
      }
    }

    let userId: string
    if (!existing) {
      const [created] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          avatar_url: input.avatarUrl,
          google_sub: input.sub,
          status: 'ACTIVE',
        })
        .returning({ id: users.id })
      userId = created.id
      await tx.insert(userLogs).values({ user_id: userId, status: 'ACTIVE' })
    } else {
      userId = existing.id
      if (existing.status === 'ACTIVE') {
        await tx
          .update(users)
          .set({
            name: input.name,
            email: input.email,
            avatar_url: input.avatarUrl,
            updated_at: sql`now()`,
          })
          .where(eq(users.id, userId))
      }
    }

    const viewBeforeDefaults = await getProfileView(tx, userId)
    if (!viewBeforeDefaults) throw new HttpError(401, 'not_authenticated', 'Profil tidak ditemukan.')
    if (!isAccountActive(viewBeforeDefaults.status ?? 'ACTIVE')) return viewBeforeDefaults

    const [provider] = await tx
      .select()
      .from(providers)
      .where(and(eq(providers.user_id, userId), eq(providers.provider_name, GOOGLE_PROVIDER), isNull(providers.deleted_at)))
      .limit(1)
    if (provider) {
      await tx.update(providers).set({ updated_at: sql`now()` }).where(eq(providers.id, provider.id))
    } else {
      await tx.insert(providers).values({ user_id: userId, provider_name: GOOGLE_PROVIDER })
    }

    const planRows = await getCurrentPlanRows(tx, userId)
    if (!planRows.some((row) => !row.ended_at && !row.deleted_at)) {
      await tx.insert(userPlans).values({ user_id: userId, plan_id: await getPlanIdByName(tx, 'free') })
    }

    const roleRows = await getActiveRoleRows(tx, userId)
    if (!roleRows.some((row) => !row.deleted_at)) {
      await tx.insert(userRoles).values({ user_id: userId, role_id: await getRoleIdByName(tx, 'guest') })
    }

    const view = await getProfileView(tx, userId)
    if (!view) throw new HttpError(401, 'not_authenticated', 'Profil tidak ditemukan.')
    return view
  })
}

export async function getProfileById(userId: string): Promise<ProfileRow | null> {
  if (!UUID_RE.test(userId)) return null
  return getProfileView(getDb(), userId)
}

export function assertActiveProfile(profile: ProfileRow) {
  if (!isAccountActive(profile.status ?? 'ACTIVE')) {
    throw new HttpError(403, 'account_inactive', 'Akun tidak aktif.')
  }
}

export async function getConfigRow(): Promise<AppConfigRow> {
  const [benefit, price, app] = await Promise.all([
    getFreeBenefit(getDb()),
    getPriceConfig(),
    getAppConfig(),
  ])
  const config = deriveConfigFromFreeBenefit(benefit, price)
  return {
    free_max_participants: config.freeMaxParticipants,
    free_max_questions: config.freeMaxQuestions,
    free_max_rooms: config.freeMaxRooms,
    pro_price: config.proPrice,
    pro_price_after_discount: config.proPriceAfterDiscount,
    maintenance_enabled: app?.maintenance_enabled ?? false,
    maintenance_message_id: app?.maintenance_message_id ?? '',
    maintenance_message_en: app?.maintenance_message_en ?? '',
  }
}

export async function updateConfigRow(patch: Partial<AppConfig>): Promise<AppConfigRow> {
  await getDb().transaction(async (tx) => {
    if (patch.proPrice !== undefined || patch.proPriceAfterDiscount !== undefined) {
      const set: Partial<typeof plans.$inferInsert> = { updated_at: sql`now()` as unknown as string }
      if (patch.proPrice !== undefined) set.price = String(patch.proPrice)
      if (patch.proPriceAfterDiscount !== undefined) {
        set.price_after_discount = String(patch.proPriceAfterDiscount)
      }
      await tx.update(plans).set(set).where(eq(plans.name, 'pro'))
    }

    if (patch.maintenance !== undefined) {
      await tx
        .insert(app_config)
        .values({
          id: APP_CONFIG_ID,
          maintenance_enabled: patch.maintenance.enabled,
          maintenance_message_id: patch.maintenance.message.id,
          maintenance_message_en: patch.maintenance.message.en,
        })
        .onConflictDoUpdate({
          target: app_config.id,
          set: {
            maintenance_enabled: patch.maintenance.enabled,
            maintenance_message_id: patch.maintenance.message.id,
            maintenance_message_en: patch.maintenance.message.en,
            updated_at: sql`now()`,
          },
        })
    }

    const benefitPatch: Partial<PlanBenefitRow> = {}
    if (patch.freeMaxRooms !== undefined) benefitPatch.max_room = patch.freeMaxRooms
    if (patch.freeMaxQuestions !== undefined) benefitPatch.question_per_session = patch.freeMaxQuestions
    if (patch.freeMaxParticipants !== undefined) {
      benefitPatch.mode = patch.freeMaxParticipants > 2 ? 'berdua + grup' : 'berdua'
    }
    if (Object.keys(benefitPatch).length > 0) {
      const freePlanId = await getPlanIdByName(tx, 'free')
      const [benefit] = await tx
        .select()
        .from(planBenefits)
        .where(and(eq(planBenefits.plan_id, freePlanId), isNull(planBenefits.deleted_at)))
        .limit(1)
      if (!benefit) throw new HttpError(500, 'config_error', 'Benefit plan free belum di-seed.')
      await tx.update(planBenefits).set({ ...benefitPatch, updated_at: sql`now()` }).where(eq(planBenefits.id, benefit.id))
    }
  })

  return getConfigRow()
}

export async function getAnnouncementRow() {
  const [row] = await getDb().select().from(announcements).limit(1)
  return row ?? null
}

export async function updateAnnouncementRow(row: {
  message_id: string
  message_en: string
  enabled: boolean
}) {
  await getDb()
    .insert(announcements)
    .values({ id: true, ...row })
    .onConflictDoUpdate({
      target: announcements.id,
      set: { ...row, updated_at: sql`now()` },
    })
}

export async function listQuestionRows(): Promise<QuestionRow[]> {
  return getQuestionRows(getDb())
}

export async function createQuestionRow(input: {
  text_id: string
  text_en: string
  category: Category
  depth: Depth
  bias: Bias
  for_group: boolean
}): Promise<QuestionRow> {
  const category = await getCategoryByName(getDb(), input.category)
  const [row] = await getDb()
    .insert(questions)
    .values({
      question_code: `custom-${crypto.randomUUID()}`,
      text_id: input.text_id,
      text_en: input.text_en,
      category_id: category.id,
      depth: input.depth,
      bias: input.bias,
      for_group: input.for_group,
    })
    .returning({ id: questions.id })
  const [created] = (await getQuestionRows(getDb())).filter((q) => q.id === row.id)
  return created
}

export async function updateQuestionRow(
  id: string,
  patch: Partial<Omit<QuestionRow, 'id' | 'question_code' | 'created_at'>>,
): Promise<QuestionRow> {
  requireUuid(id, 'question_not_found', 'Pertanyaan tidak ditemukan.')
  const row: Partial<typeof questions.$inferInsert> = {}
  if (patch.text_id !== undefined) row.text_id = patch.text_id
  if (patch.text_en !== undefined) row.text_en = patch.text_en
  if (patch.depth !== undefined) row.depth = patch.depth
  if (patch.bias !== undefined) row.bias = patch.bias
  if (patch.for_group !== undefined) row.for_group = patch.for_group
  if (patch.category !== undefined) {
    row.category_id = (await getCategoryByName(getDb(), patch.category)).id
  }
  const [updated] = await getDb()
    .update(questions)
    .set(row)
    .where(eq(questions.id, id))
    .returning({ id: questions.id })
  if (!updated) throw new HttpError(404, 'question_not_found', 'Pertanyaan tidak ditemukan.')
  const [question] = (await getQuestionRows(getDb())).filter((q) => q.id === id)
  return question
}

export async function deleteQuestionRow(id: string) {
  requireUuid(id, 'question_not_found', 'Pertanyaan tidak ditemukan.')
  await getDb().delete(questions).where(eq(questions.id, id))
}

export async function listRoomsForUser(userId: string): Promise<RoomRow[]> {
  requireUuid(userId)
  const rows = await getDb()
    .select({
      id: rooms.id,
      user_id: rooms.user_id,
      participant_count: rooms.participant_count,
      category: questionCategories.name,
      personalities: rooms.personalities,
      deck: rooms.deck,
      current_index: rooms.current_index,
      favorites: rooms.favorites,
      status: rooms.status,
      window_start: rooms.window_start,
      exhausted_at: rooms.exhausted_at,
      created_at: rooms.created_at,
      ended_at: rooms.ended_at,
    })
    .from(rooms)
    .innerJoin(questionCategories, eq(rooms.category_id, questionCategories.id))
    .where(eq(rooms.user_id, userId))
    .orderBy(desc(rooms.created_at))
  return rows as RoomRow[]
}

export async function getRoomForUser(userId: string, roomId: string): Promise<RoomRow | null> {
  requireUuid(userId)
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  return getRoomRow(getDb(), userId, roomId)
}

export async function createRoomForUser(
  user: User,
  setup: {
    participantCount: number
    category: Category
    personalities?: [Personality, Personality]
  },
): Promise<RoomRow> {
  return await getDb().transaction(
    async (tx) => {
      const cfg = await getConfigFromClient(tx)
      if (user.plan === 'free' && setup.participantCount > cfg.freeMaxParticipants) {
        throw new HttpError(402, 'paywall:participants', 'Batas paket gratis tercapai.')
      }

      const [{ value: roomCount }] = await tx
        .select({ value: count() })
        .from(rooms)
        .where(eq(rooms.user_id, user.id))
      if (user.plan === 'free' && roomCount >= cfg.freeMaxRooms) {
        throw new HttpError(402, 'paywall:rooms', 'Batas paket gratis tercapai.')
      }

      const category = await getCategoryByName(tx, setup.category)
      const bankRows = await getQuestionRows(tx)
      const bank = bankRows.map(toQuestion)
      const deck = buildDeck(bank, setup).map((q) => q.id)
      if (deck.length === 0) {
        throw new HttpError(400, 'validation_error', 'Tidak ada kartu untuk kombinasi ini.')
      }

      const [room] = await tx
        .insert(rooms)
        .values({
          user_id: user.id,
          participant_count: setup.participantCount,
          category_id: category.id,
          personalities: setup.personalities ?? null,
          deck,
          window_start: 0,
        })
        .returning({ id: rooms.id })
      const created = await getRoomRow(tx, user.id, room.id)
      if (!created) throw new HttpError(500, 'internal_error', 'Room gagal dibuat.')
      return created
    },
    { isolationLevel: 'serializable' },
  )
}

async function getConfigFromClient(client: SelectClient): Promise<AppConfig> {
  return deriveConfigFromFreeBenefit(await getFreeBenefit(client), await getPriceConfig(client))
}

export async function advanceRoomCard(user: User, roomId: string): Promise<RoomRow> {
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  return await getDb().transaction(
    async (tx) => {
      const [room] = await tx
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, roomId), eq(rooms.user_id, user.id)))
        .limit(1)
      if (!room) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')

      const nextIndex = room.current_index + 1
      const now = new Date()
      const nowIso = now.toISOString()
      if (nextIndex >= room.deck.length) {
        await tx
          .update(rooms)
          .set({ status: 'completed', ended_at: nowIso })
          .where(eq(rooms.id, roomId))
        const updated = await getRoomRow(tx, user.id, roomId)
        if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
        return updated
      }

      if (user.plan !== 'free') {
        await tx.update(rooms).set({ current_index: nextIndex }).where(eq(rooms.id, roomId))
        const updated = await getRoomRow(tx, user.id, roomId)
        if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
        return updated
      }

      const cfg = await getConfigFromClient(tx)
      let windowStart = room.window_start ?? 0
      let exhaustedAt = room.exhausted_at

      if (nextIndex - windowStart >= cfg.freeMaxQuestions) {
        const resetAt = exhaustedAt
          ? new Date(new Date(exhaustedAt).getTime() + QUESTION_RESET_MS)
          : now
        if (now.getTime() < resetAt.getTime()) {
          throw new HttpError(402, 'paywall:questions', 'Kuota kartu habis.', resetAt.toISOString())
        }
        windowStart = nextIndex
        exhaustedAt = null
      }

      if (nextIndex - windowStart === cfg.freeMaxQuestions - 1) {
        exhaustedAt = nowIso
      }

      await tx
        .update(rooms)
        .set({
          current_index: nextIndex,
          window_start: windowStart,
          exhausted_at: exhaustedAt,
        })
        .where(eq(rooms.id, roomId))
      const updated = await getRoomRow(tx, user.id, roomId)
      if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
      return updated
    },
    { isolationLevel: 'serializable' },
  )
}

export async function toggleFavorite(userId: string, roomId: string, questionId: string): Promise<RoomRow> {
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  requireUuid(questionId, 'question_not_found', 'Pertanyaan tidak ditemukan.')
  return await getDb().transaction(async (tx) => {
    const [room] = await tx
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.user_id, userId)))
      .limit(1)
    if (!room) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')

    const favorites = room.favorites.includes(questionId)
      ? room.favorites.filter((id) => id !== questionId)
      : [...room.favorites, questionId]

    await tx.update(rooms).set({ favorites }).where(eq(rooms.id, roomId))
    const updated = await getRoomRow(tx, userId, roomId)
    if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
    return updated
  })
}

export async function endRoom(userId: string, roomId: string): Promise<RoomRow> {
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  await getDb()
    .update(rooms)
    .set({ status: 'completed', ended_at: new Date().toISOString() })
    .where(and(eq(rooms.id, roomId), eq(rooms.user_id, userId)))
  const updated = await getRoomRow(getDb(), userId, roomId)
  if (!updated) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
  return updated
}

export async function deleteRoomForUser(user: User, roomId: string) {
  requireUuid(roomId, 'room_not_found', 'Room tidak ditemukan.')
  await getDb().transaction(async (tx) => {
    const [room] = await tx
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.user_id, user.id)))
      .limit(1)
    if (!room) throw new HttpError(404, 'room_not_found', 'Room tidak ditemukan.')
    if (room.status !== 'completed') {
      throw new HttpError(
        409,
        'room_still_active',
        'Room masih aktif. Akhiri sesi dulu sebelum menghapus.',
      )
    }
    const cooldownBase = new Date(room.ended_at ?? room.created_at).getTime()
    if (user.plan === 'free' && Date.now() < cooldownBase + ROOM_DELETE_COOLDOWN_MS) {
      throw new HttpError(
        409,
        'room_delete_cooldown',
        'Room baru bisa dihapus 6 jam setelah selesai.',
      )
    }
    await tx.delete(rooms).where(eq(rooms.id, roomId))
  })
}

export async function listProfileRows(): Promise<ProfileRow[]> {
  const baseRows = await getDb().select({ id: users.id }).from(users).orderBy(desc(users.created_at))
  const rows = await Promise.all(baseRows.map((row) => getProfileView(getDb(), row.id)))
  return rows.filter((row): row is ProfileRow => Boolean(row))
}

export async function setUserPlan(userId: string, plan: Plan) {
  requireUuid(userId)
  await getDb().transaction(async (tx) => {
    await tx
      .update(userPlans)
      .set({ ended_at: sql`now()`, updated_at: sql`now()` })
      .where(and(eq(userPlans.user_id, userId), isNull(userPlans.ended_at), isNull(userPlans.deleted_at)))
    await tx.insert(userPlans).values({ user_id: userId, plan_id: await getPlanIdByName(tx, plan) })
  })
  const row = await getProfileView(getDb(), userId)
  if (!row) throw new HttpError(404, 'user_not_found', 'User tidak ditemukan.')
  return row
}

const TERMINAL_TRANSACTION_STATUSES: TransactionStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'expired',
  'refunded',
]

export async function createPendingTransaction(user: User, planName: Plan) {
  const [plan] = await getDb()
    .select({
      id: plans.id,
      price: plans.price,
      price_after_discount: plans.price_after_discount,
      duration_days: plans.duration_days,
    })
    .from(plans)
    .where(and(eq(plans.name, planName), eq(plans.is_active, true), isNull(plans.deleted_at)))
    .limit(1)
  if (!plan || !plan.duration_days) {
    throw new HttpError(400, 'validation_error', `Plan ${planName} tidak bisa dibeli.`)
  }

  const amount = plan.price_after_discount ?? plan.price
  const referenceId = `TRX-${crypto.randomUUID()}`
  const [transaction] = await getDb()
    .insert(transactions)
    .values({ user_id: user.id, plan_id: plan.id, amount, reference_id: referenceId })
    .returning({ id: transactions.id, reference_id: transactions.reference_id })

  return { transaction, amount: Number(amount) }
}

export async function markTransactionExpiry(referenceId: string, expiresAt: string) {
  await getDb()
    .update(transactions)
    .set({ expires_at: expiresAt, updated_at: sql`now()` })
    .where(eq(transactions.reference_id, referenceId))
}

export async function getTransactionStatus(userId: string, referenceId: string) {
  const [txn] = await getDb()
    .select({ status: transactions.status })
    .from(transactions)
    .where(and(eq(transactions.reference_id, referenceId), eq(transactions.user_id, userId)))
    .limit(1)
  return txn ?? null
}

interface MidtransNotificationStatus {
  order_id: string
  transaction_id: string
  transaction_status: string
  fraud_status?: string
  payment_type?: string
  expiry_time?: string
}

/**
 * Idempotent: notification retry Midtrans untuk order_id yang statusnya
 * sudah terminal akan no-op, tidak dobel-grant plan.
 */
export async function applyPaymentNotification(status: MidtransNotificationStatus) {
  const mapped = mapMidtransStatus(status.transaction_status, status.fraud_status)

  const completed = await getDb().transaction(async (tx) => {
    const [txn] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.reference_id, status.order_id))
      .limit(1)
    if (!txn) throw new HttpError(404, 'transaction_not_found', 'Transaksi tidak ditemukan.')
    if (TERMINAL_TRANSACTION_STATUSES.includes(txn.status as TransactionStatus)) return null

    await tx
      .update(transactions)
      .set({
        status: mapped,
        gateway_transaction_id: status.transaction_id,
        method: status.payment_type ?? txn.method,
        fraud_status: status.fraud_status ?? null,
        paid_at: mapped === 'completed' ? sql`now()` : txn.paid_at,
        expires_at: status.expiry_time ?? txn.expires_at,
        updated_at: sql`now()`,
      })
      .where(eq(transactions.id, txn.id))

    if (mapped !== 'completed') return null

    const [plan] = await tx
      .select({ duration_days: plans.duration_days })
      .from(plans)
      .where(eq(plans.id, txn.plan_id))
      .limit(1)
    await tx.insert(subscriptions).values({
      user_id: txn.user_id,
      plan_id: txn.plan_id,
      transaction_id: txn.id,
      status: 'active',
      ends_at: sql`now() + ${plan?.duration_days ?? 30} * interval '1 day'`,
    })
    return { userId: txn.user_id }
  })

  if (completed) await setUserPlan(completed.userId, 'pro')
}

/** Dipanggil cron: turunkan user yang periode langganannya sudah lewat. */
export async function expireDueSubscriptions() {
  const due = await getDb()
    .select({ id: subscriptions.id, user_id: subscriptions.user_id })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), lt(subscriptions.ends_at, sql`now()`)))

  for (const sub of due) {
    await setUserPlan(sub.user_id, 'free')
    await getDb()
      .update(subscriptions)
      .set({ status: 'expired', updated_at: sql`now()` })
      .where(eq(subscriptions.id, sub.id))
  }
  return { expired: due.length }
}

export async function markUserDeletionProcessing(userId: string) {
  requireUuid(userId)
  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({ status: deletionStatusSequence[0], updated_at: sql`now()` })
      .where(eq(users.id, userId))
    await tx.insert(userLogs).values({ user_id: userId, status: deletionStatusSequence[0] })
  })
}

export async function finalizeSoftDeleteUser(userId: string) {
  requireUuid(userId)
  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: '',
        email: `deleted-${userId}@deleted.local`,
        avatar_url: '',
        google_sub: null,
        status: deletionStatusSequence[1],
        updated_at: sql`now()`,
        deleted_at: sql`now()`,
      })
      .where(eq(users.id, userId))
    await tx.update(providers).set({ updated_at: sql`now()`, deleted_at: sql`now()` }).where(and(eq(providers.user_id, userId), isNull(providers.deleted_at)))
    await tx.update(userRoles).set({ updated_at: sql`now()`, deleted_at: sql`now()` }).where(and(eq(userRoles.user_id, userId), isNull(userRoles.deleted_at)))
    await tx
      .update(userPlans)
      .set({ ended_at: sql`now()`, updated_at: sql`now()`, deleted_at: sql`now()` })
      .where(and(eq(userPlans.user_id, userId), isNull(userPlans.deleted_at)))
    await tx.insert(userLogs).values({ user_id: userId, status: deletionStatusSequence[1] })
  })
}
