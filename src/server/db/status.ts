import { DEFAULT_APP_CONFIG, type AppConfig, type Plan, type Role } from '@/services/types'
import type { PlanBenefitRow } from '../mappers'

export type UserStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'SUSPENDED'
  | 'PAUSED'
  | 'DELETION_PROCESS'
  | 'DELETED'

export interface PlanCandidate {
  name: Plan
  started_at: string
  ended_at: string | null
  deleted_at: string | null
}

export interface RoleCandidate {
  name: Role
  created_at: string
  deleted_at: string | null
}

export const deletionStatusSequence: UserStatus[] = ['DELETION_PROCESS', 'DELETED']

export function isAccountActive(status: UserStatus) {
  return status === 'ACTIVE'
}

export function resolveCurrentPlanName(rows: PlanCandidate[]): Plan {
  const active = rows
    .filter((row) => !row.ended_at && !row.deleted_at)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  return active[0]?.name ?? 'free'
}

export function resolveActiveRoleName(rows: RoleCandidate[]): Role {
  const active = rows.filter((row) => !row.deleted_at)
  if (active.some((row) => row.name === 'admin')) return 'admin'
  return active[0]?.name ?? 'guest'
}

export function deriveFreeMaxParticipants(mode: string): number {
  return mode === 'berdua + grup' ? 99 : 2
}

export function deriveConfigFromFreeBenefit(
  benefit: PlanBenefitRow | null,
  price: { price: string | number; price_after_discount: string | number | null } | null,
): AppConfig {
  const proPrice = price ? Number(price.price) : DEFAULT_APP_CONFIG.proPrice
  const proDiscount = price?.price_after_discount
    ? Number(price.price_after_discount)
    : DEFAULT_APP_CONFIG.proPriceAfterDiscount
  return {
    freeMaxParticipants: deriveFreeMaxParticipants(benefit?.mode ?? 'berdua'),
    freeMaxQuestions: benefit?.question_per_session ?? DEFAULT_APP_CONFIG.freeMaxQuestions,
    freeMaxRooms: benefit?.max_room ?? DEFAULT_APP_CONFIG.freeMaxRooms,
    proPrice,
    proPriceAfterDiscount: proDiscount,
  }
}
