import { describe, expect, test } from 'vitest'
import { resolveInstallGate } from './installGate'
import type { User } from '../services/types'

const makeUser = (plan: User['plan']): Pick<User, 'plan'> => ({ plan })

describe('resolveInstallGate', () => {
  test('belum login → login', () => {
    expect(resolveInstallGate(null)).toBe('login')
  })

  test('login plan free → paywall', () => {
    expect(resolveInstallGate(makeUser('free'))).toBe('paywall')
  })

  test('login plan pro → allowed', () => {
    expect(resolveInstallGate(makeUser('pro'))).toBe('allowed')
  })
})
