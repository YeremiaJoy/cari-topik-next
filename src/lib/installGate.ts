import type { User } from '../services/types'

export type InstallGate = 'login' | 'paywall' | 'allowed'

/**
 * Pasang aplikasi adalah keunggulan Pro:
 * - belum login → arahkan ke login
 * - login tapi Gratis → paywall upgrade
 * - Pro → boleh lanjut ke prompt pemasangan
 */
export function resolveInstallGate(user: Pick<User, 'plan'> | null): InstallGate {
  if (!user) return 'login'
  if (user.plan !== 'pro') return 'paywall'
  return 'allowed'
}
