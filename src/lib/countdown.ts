/** Format sisa milidetik menjadi "hh:mm:ss" (dibulatkan ke atas ke detik penuh). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/** Mulai kapan perpanjangan ditawarkan sebelum masa Pro habis. */
export const RENEWAL_WINDOW_DAYS = 30

/**
 * Sisa hari masa Pro, dibulatkan ke atas — sisa beberapa jam tetap dihitung
 * satu hari, karena "0 hari lagi" buat langganan yang masih jalan itu bohong.
 * Null kalau tidak ada masa berlaku (akun free atau Pro pemberian admin).
 */
export function daysUntil(endsAt: string | undefined, now = Date.now()): number | null {
  if (!endsAt) return null
  const ms = Date.parse(endsAt) - now
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

/** Sudah cukup dekat untuk menawarkan perpanjangan. */
export function isRenewalDue(endsAt: string | undefined, now = Date.now()): boolean {
  const days = daysUntil(endsAt, now)
  return days !== null && days <= RENEWAL_WINDOW_DAYS
}
