import type {
  AppConfig,
  Announcement,
  Bias,
  Category,
  Depth,
  Personality,
  Plan,
  Question,
  Role,
  Room,
  User,
} from '../services/types'
import type { UserStatus } from './db/status'

export interface ProfileRow {
  id: string
  name: string
  email: string
  avatar_url: string
  plan: Plan
  role: Role
  status?: UserStatus
  created_at: string
}

export interface RoomRow {
  id: string
  user_id: string
  participant_count: number
  category: Category
  personalities: [Personality, Personality] | null
  deck: string[]
  current_index: number
  favorites: string[]
  status: 'active' | 'completed'
  window_start: number | null
  exhausted_at: string | null
  created_at: string
  ended_at: string | null
}

export interface QuestionRow {
  id: string
  question_code: string
  text_id: string
  text_en: string
  category: Category
  depth: Depth
  bias: Bias
  for_group: boolean
}

export interface AppConfigRow {
  free_max_participants: number
  free_max_questions: number
  free_max_rooms: number
  pro_price: number
  pro_price_after_discount: number
  maintenance_enabled?: boolean
  maintenance_message_id?: string
  maintenance_message_en?: string
}

export interface PlanBenefitRow {
  max_room: number
  mode: string
  question_per_session: number
  personalized_deck: boolean
  offline_support: boolean
}

export interface AnnouncementRow {
  message_id: string
  message_en: string
  enabled: boolean
}

export function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    plan: row.plan,
    role: row.role,
    createdAt: row.created_at,
  }
}

export function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    setup: {
      participantCount: row.participant_count,
      category: row.category,
      personalities: row.personalities ?? undefined,
    },
    deck: row.deck,
    currentIndex: row.current_index,
    favorites: row.favorites,
    status: row.status,
    createdAt: row.created_at,
    endedAt: row.ended_at ?? undefined,
    windowStart: row.window_start ?? undefined,
    exhaustedAt: row.exhausted_at ?? undefined,
  }
}

export function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    text: { id: row.text_id, en: row.text_en },
    category: row.category,
    depth: row.depth,
    bias: row.bias,
    forGroup: row.for_group || undefined,
  }
}

export function toAppConfig(row: AppConfigRow): AppConfig {
  return {
    freeMaxParticipants: row.free_max_participants,
    freeMaxQuestions: row.free_max_questions,
    freeMaxRooms: row.free_max_rooms,
    proPrice: row.pro_price,
    proPriceAfterDiscount: row.pro_price_after_discount,
    maintenance: {
      enabled: Boolean(row.maintenance_enabled),
      message: {
        id: row.maintenance_message_id ?? '',
        en: row.maintenance_message_en ?? '',
      },
    },
  }
}

export function toAnnouncement(row: AnnouncementRow | null): Announcement | null {
  if (!row || (!row.message_id && !row.message_en)) return null
  return {
    message: { id: row.message_id, en: row.message_en },
    enabled: row.enabled,
  }
}
