import { describe, expect, it } from 'vitest'
import {
  deletionStatusSequence,
  deriveConfigFromFreeBenefit,
  isAccountActive,
  resolveActiveRoleName,
  resolveCurrentPlanName,
} from './status'

describe('normalized account catalog helpers', () => {
  it('resolves current plan from active user_plan history', () => {
    expect(
      resolveCurrentPlanName([
        { name: 'free', started_at: '2026-01-01T00:00:00.000Z', ended_at: null, deleted_at: null },
        { name: 'pro', started_at: '2026-02-01T00:00:00.000Z', ended_at: null, deleted_at: null },
        { name: 'free', started_at: '2025-01-01T00:00:00.000Z', ended_at: '2025-02-01T00:00:00.000Z', deleted_at: null },
      ]),
    ).toBe('pro')
  })

  it('resolves active admin role from user_role rows', () => {
    expect(
      resolveActiveRoleName([
        { name: 'guest', created_at: '2026-01-01T00:00:00.000Z', deleted_at: null },
        { name: 'admin', created_at: '2026-01-02T00:00:00.000Z', deleted_at: null },
      ]),
    ).toBe('admin')
  })

  it('derives config free limits from plan_benefit', () => {
    expect(
      deriveConfigFromFreeBenefit(
        {
          max_room: 1,
          mode: 'berdua',
          question_per_session: 5,
          personalized_deck: false,
          offline_support: false,
        },
        { price: 50000, price_after_discount: 19000 },
      ),
    ).toMatchObject({
      freeMaxParticipants: 2,
      freeMaxQuestions: 5,
      freeMaxRooms: 1,
      proPriceAfterDiscount: 19000,
    })
  })

  it('blocks non-active user status', () => {
    expect(isAccountActive('ACTIVE')).toBe(true)
    expect(isAccountActive('SUSPENDED')).toBe(false)
    expect(isAccountActive('DELETED')).toBe(false)
  })

  it('keeps soft-delete status log sequence explicit', () => {
    expect(deletionStatusSequence).toEqual(['DELETION_PROCESS', 'DELETED'])
  })
})
