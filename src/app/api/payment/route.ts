import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withErrors } from '@/server/handler'
import { jsonError } from '@/server/errors'
import { createPendingTransaction, markTransactionExpiry } from '@/server/db/operations'
import { createSnapTransaction, SNAP_EXPIRY_HOURS } from '@/server/midtrans'
import type { Plan } from '@/services/types'

const PURCHASABLE_PLANS: Plan[] = ['pro']

/** Mulai pembelian plan: buat transaksi pending + Snap charge, kembalikan token. */
export async function POST(request: Request) {
  return withErrors(async () => {
    const { user } = await requireUser()
    const body = await request.json().catch(() => null)
    const plan = body?.plan as Plan

    if (!PURCHASABLE_PLANS.includes(plan)) {
      return jsonError(400, 'validation_error', 'Plan tidak bisa dibeli.')
    }

    const { transaction, amount } = await createPendingTransaction(user, plan)
    const snap = await createSnapTransaction({
      orderId: transaction.reference_id,
      grossAmount: amount,
      customer: { first_name: user.name || user.email, email: user.email },
    })
    await markTransactionExpiry(
      transaction.reference_id,
      new Date(Date.now() + SNAP_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    )

    return NextResponse.json(
      { token: snap.token, redirectUrl: snap.redirect_url, referenceId: transaction.reference_id },
      { status: 201 },
    )
  })
}
