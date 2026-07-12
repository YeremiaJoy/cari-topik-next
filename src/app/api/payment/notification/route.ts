import { NextResponse } from 'next/server'
import { withErrors } from '@/server/handler'
import { applyPaymentNotification } from '@/server/db/operations'
import { fetchNotificationStatus } from '@/server/midtrans'

/**
 * Webhook server-to-server Midtrans — tanpa auth, tanpa sesi user.
 * Keabsahan dicek dengan re-fetch status ke Midtrans by transaction_id
 * (fetchNotificationStatus), bukan cuma cocokkan signature_key di body.
 */
export async function POST(request: Request) {
  return withErrors(async () => {
    const body = await request.json().catch(() => null)
    const status = await fetchNotificationStatus(body)
    await applyPaymentNotification(status)
    return new NextResponse(null, { status: 200 })
  })
}
